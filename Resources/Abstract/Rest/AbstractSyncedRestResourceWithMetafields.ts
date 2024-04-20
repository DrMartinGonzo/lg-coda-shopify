// #region Imports
import * as coda from '@codahq/packs-sdk';

import { SyncTableUpdateResult } from '../../../SyncTableManager/types/SyncTable.types';
import { BaseRow } from '../../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { MetafieldDefinition } from '../../GraphQl/MetafieldDefinition';
import { MetafieldHelper } from '../../Mixed/MetafieldHelper';
import { Metafield, SupportedMetafieldOwnerResource } from '../../Rest/Metafield';
import { hasMetafieldsInRow, hasMetafieldsInUpdate } from '../../utils/abstractResource-utils';
import { RestApiData, SaveArgs } from './AbstractRestResource';
import { AbstractSyncedRestResource } from './AbstractSyncedRestResource';

// #endregion

// #region Types
export interface RestApiDataWithMetafields extends RestApiData {
  metafields:
    | Metafield[]
    | null
    | {
        [key: string]: any;
      };
}
// #endregion

export abstract class AbstractSyncedRestResourceWithMetafields extends AbstractSyncedRestResource {
  public apiData: RestApiDataWithMetafields;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource;
  public static readonly metafieldGraphQlOwnerType: MetafieldOwnerType;
  protected static metafieldDefinitions: Array<MetafieldDefinition>;

  // TODO: seems to be called too many times
  protected static async getMetafieldDefinitions(context: coda.ExecutionContext): Promise<Array<MetafieldDefinition>> {
    if (this.metafieldDefinitions) return this.metafieldDefinitions;

    this.metafieldDefinitions = await MetafieldHelper.getMetafieldDefinitionsForOwner({
      context,
      ownerType: this.metafieldGraphQlOwnerType,
    });

    return this.metafieldDefinitions;
  }

  protected static async handleRowUpdate(prevRow: BaseRow, newRow: BaseRow, context: coda.SyncExecutionContext) {
    if (hasMetafieldsInRow(newRow)) {
      const metafieldDefinitions = await this.getMetafieldDefinitions(context);
      const metafields = await Metafield.createInstancesFromRow({
        context,
        row: newRow,
        metafieldDefinitions,
        ownerResource: this.metafieldRestOwnerType,
      });
      const instance: AbstractSyncedRestResourceWithMetafields = new (this as any)({
        context,
        fromRow: { row: newRow, metafields },
      });

      await instance.saveAndUpdate();
      return { ...prevRow, ...instance.formatToRow() };
    }

    return super.handleRowUpdate(prevRow, newRow, context);
  }

  public static async syncUpdate(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    updates: Array<coda.SyncUpdate<string, string, typeof this._schemaCache.items>>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableUpdateResult> {
    // Warm up metafield definitions cache
    if (updates.map(hasMetafieldsInUpdate).some(Boolean)) {
      await this.getMetafieldDefinitions(context);
    }
    return super.syncUpdate(codaSyncParams, updates, context);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async save({ update = false }: SaveArgs = {}): Promise<void> {
    if (this.apiData.metafields && this.apiData.metafields.length) {
      const staticOwnerResource = this.resource<typeof AbstractSyncedRestResourceWithMetafields>();
      const { primaryKey } = staticOwnerResource;
      const method = this.apiData[primaryKey] ? 'put' : 'post';

      /** When performing a PUT request, we must create/update/delete metafields individually */
      if (method === 'put') {
        const newMetafields = await Promise.all(
          this.apiData.metafields.map(async (metafield: Metafield) => {
            await metafield.saveAndUpdate();
            return metafield;
          })
        );

        await super.save({ update });
        if (update) this.apiData.metafields = newMetafields;

        return;
      }
      //
      /** When performing a POST request, we can create the metafields in bulk directly on the main request.
       * We have to use the metafields data and not the Metafield instances themselves.  */
      else {
        this.apiData.metafields = this.apiData.metafields.map((metafield: Metafield) => {
          return metafield.apiData;
        });
      }
    }

    await super.save({ update });
  }
}
