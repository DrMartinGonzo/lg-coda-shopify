import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../../utils/graphql';

import { REST_DEFAULT_LIMIT } from '../../constants';
import { graphQlGidToId } from '../../helpers-graphql';
import { fetchMetafieldDefinitionsGraphQl } from '../../resources/metafieldDefinitions/metafieldDefinitions-functions';
import { metafieldDefinitionFragment } from '../../resources/metafieldDefinitions/metafieldDefinitions-graphql';
import { hasMetafieldsInRow, hasMetafieldsInUpdate } from '../../resources/metafields/utils/metafields-utils';
import { getMetafieldKeyValueSetsFromUpdate } from '../../resources/metafields/utils/metafields-utils-keyValueSets';
import { getMetaFieldFullKey } from '../../resources/metafields/utils/metafields-utils-keys';
import { BaseRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { SyncTableRestContinuation, SyncTableSyncResult, SyncTableUpdateResult } from '../SyncTable/SyncTable.types';
import { FindAllResponse, SaveArgs } from './AbstractResource';
import { AbstractResource_Synced, SyncFunction } from './AbstractResource_Synced';
import { Metafield, RestMetafieldOwnerType } from './Resources/Metafield';
import { SearchParams } from './RestClientNEW';
import { SyncTableRestHasRestMetafields } from './SyncTableRestHasRestMetafields';

// #region Types
export type ApiDataWithMetafields = {
  metafields:
    | Metafield[]
    | null
    | {
        [key: string]: any;
      };
};

export type AugmentWithMetafieldsFunction = (
  base: AbstractResource_Synced_HasMetafields
) => Promise<FindAllResponse<Metafield>>;
// #endregion

export abstract class AbstractResource_Synced_HasMetafields extends AbstractResource_Synced {
  public apiData: any & ApiDataWithMetafields;

  protected static readonly metafieldRestOwnerType: RestMetafieldOwnerType;
  protected static readonly metafieldGraphQlOwnerType: MetafieldOwnerType;
  protected static readonly supportsDefinitions: boolean;
  protected static metafieldDefinitions: Array<ResultOf<typeof metafieldDefinitionFragment>>;

  protected static augmentWithMetafieldsFunction(context: coda.ExecutionContext): AugmentWithMetafieldsFunction {
    return async (base: AbstractResource_Synced_HasMetafields) => {
      return Metafield.all({
        context,
        ['metafield[owner_id]']: base.apiData.id,
        ['metafield[owner_resource]']: this.metafieldRestOwnerType,
      });
    };
  }

  protected static async getMetafieldDefinitions(
    context: coda.ExecutionContext,
    includeFakeExtraDefinitions?: boolean
  ) {
    if (this.metafieldDefinitions) return this.metafieldDefinitions;
    this.metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(
      { ownerType: this.metafieldGraphQlOwnerType, includeFakeExtraDefinitions },
      context
    );
    return this.metafieldDefinitions;
  }

  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ) {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableRestHasRestMetafields<AbstractResource_Synced_HasMetafields>(schema, codaSyncParams, context);
  }

  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const syncTableManager = await this.getSyncTableManager(context, codaSyncParams);
    const sync = this.makeSyncFunction({ codaSyncParams, context, syncTableManager });
    const syncMetafields = this.augmentWithMetafieldsFunction(context);

    const { response, continuation } = await syncTableManager.executeSync({ sync, syncMetafields });
    return {
      result: response.data.map((data) => data.formatToRow()),
      continuation,
    };
  }

  public static async handleRowUpdate(prevRow: BaseRow, newRow: BaseRow, context: coda.SyncExecutionContext) {
    if (hasMetafieldsInRow(newRow)) {
      const metafieldDefinitions = await this.getMetafieldDefinitions(context);
      const metafieldSets = await getMetafieldKeyValueSetsFromUpdate(newRow, metafieldDefinitions, context);
      const metafields = metafieldSets.map((set) => Metafield.createInstancesFromMetafieldSet(context, set, newRow.id));
      const instance: AbstractResource_Synced_HasMetafields = new (this as any)({
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
      const staticOwnerResource = this.resource<typeof AbstractResource_Synced_HasMetafields>();
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
