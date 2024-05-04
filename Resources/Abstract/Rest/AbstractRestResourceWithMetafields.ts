// #region Imports
import * as coda from '@codahq/packs-sdk';

import { SyncTableManagerRestWithMetafields } from '../../../SyncTableManager/Rest/SyncTableManagerRest';
import { SyncTableManagerRestWithGraphQlMetafields } from '../../../SyncTableManager/Rest/SyncTableManagerRestWithGraphQlMetafields';
import { SyncTableSyncResult, SyncTableUpdateResult } from '../../../SyncTableManager/types/SyncTableManager.types';
import { BaseRow } from '../../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { MetafieldDefinition } from '../../GraphQl/MetafieldDefinition';
import { MetafieldHelper } from '../../Mixed/MetafieldHelper';
import { Metafield, SupportedMetafieldOwnerResource } from '../../Rest/Metafield';
import { hasMetafieldsInRow, hasMetafieldsInUpdate } from '../../utils/abstractResource-utils';
import { AbstractGraphQlResourceWithMetafields } from '../GraphQl/AbstractGraphQlResourceWithMetafields';
import { AbstractRestResource, RestApiData, SaveArgs } from './AbstractRestResource';

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

export abstract class AbstractRestResourceWithMetafields extends AbstractRestResource {
  public apiData: RestApiDataWithMetafields;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource;
  public static readonly metafieldGraphQlOwnerType: MetafieldOwnerType;
  protected static metafieldDefinitions: Array<MetafieldDefinition>;

  /** Same code as in {@link AbstractGraphQlResourceWithMetafields.getMetafieldDefinitions} */
  // TODO: deduplicate
  // TODO: maybe should go in Metafield class ?
  public static async getMetafieldDefinitions(context: coda.ExecutionContext): Promise<Array<MetafieldDefinition>> {
    if (this.metafieldDefinitions) return this.metafieldDefinitions;

    this.metafieldDefinitions = await MetafieldHelper.getMetafieldDefinitionsForOwner({
      context,
      ownerType: this.metafieldGraphQlOwnerType,
    });

    return this.metafieldDefinitions;
  }

  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ) {
    return new SyncTableManagerRestWithMetafields({
      context,
      schema: await this.getArraySchema({ codaSyncParams, context }),
      codaSyncParams,
      resource: this,
    });
  }

  protected static async handleRowUpdate(prevRow: BaseRow, newRow: BaseRow, context: coda.SyncExecutionContext) {
    if (hasMetafieldsInRow(newRow)) {
      this.validateUpdateJob(prevRow, newRow);
      const metafieldDefinitions = await this.getMetafieldDefinitions(context);
      const metafields = await Metafield.createInstancesFromRow({
        context,
        row: newRow,
        metafieldDefinitions,
        ownerResource: this.metafieldRestOwnerType,
      });
      const instance: AbstractRestResourceWithMetafields = new (this as any)({
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
      const staticOwnerResource = this.resource<typeof AbstractRestResourceWithMetafields>();
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

export abstract class AbstractRestResourceWithRestMetafields extends AbstractRestResourceWithMetafields {
  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const ownerSyncTableManager = await this.getSyncTableManager(context, codaSyncParams);
    ownerSyncTableManager.setSyncFunction(
      this.makeSyncTableManagerSyncFunction({ codaSyncParams, context, syncTableManager: ownerSyncTableManager })
    );

    /** Sync owner resource with a fixed low limit to avoid timeout due to the many Rest request for Metafields */
    const ownerSyncTableResult = await ownerSyncTableManager.executeSync({ defaultLimit: 30 });

    if (ownerSyncTableManager.shouldSyncMetafields) {
      await Promise.all(
        ownerSyncTableResult.response.data.map(async (owner) => {
          const metafieldsResponse = await Metafield.all({
            context,
            owner_id: owner.apiData.id,
            owner_resource: this.metafieldRestOwnerType,
          });
          owner.apiData.metafields = metafieldsResponse.data;
        })
      );
    }

    return {
      result: ownerSyncTableResult.response.data.map((data) => data.formatToRow()),
      continuation: ownerSyncTableResult.continuation,
    };
  }
}

export abstract class AbstractRestResourceWithGraphQLMetafields extends AbstractRestResourceWithMetafields {
  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const dualSyncTableManager = new SyncTableManagerRestWithGraphQlMetafields({
      context,
      codaSyncParams,
      resource: this,
    });
    const { response, continuation } = await dualSyncTableManager.executeSync({ defaultLimit: this.defaultLimit });
    return {
      result: response.data.map((data) => data.formatToRow()),
      continuation,
    };
  }
}
