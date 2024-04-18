// #region Imports
import * as coda from '@codahq/packs-sdk';

import { SearchParams } from '../../../Clients/RestClient';
import { SyncTableManagerRestWithRestMetafields } from '../../../SyncTableManager/Rest/SyncTableManagerRestWithRestMetafields';
import {
  SyncTableRestContinuation,
  SyncTableSyncResult,
  SyncTableUpdateResult,
} from '../../../SyncTableManager/types/SyncTable.types';
import { CACHE_DEFAULT, REST_DEFAULT_LIMIT } from '../../../constants';
import { BaseRow } from '../../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { graphQlGidToId } from '../../../utils/conversion-utils';
import { getMetaFieldFullKey } from '../../../utils/metafields-utils';
import { MetafieldDefinition } from '../../GraphQl/MetafieldDefinition';
import { Metafield, SupportedMetafieldOwnerResource } from '../../Rest/Metafield';
import { hasMetafieldsInRow, hasMetafieldsInUpdate } from '../../utils/abstractResource-utils';
import { FindAllResponse, RestApiData, SaveArgs } from './AbstractRestResource';
import { AbstractSyncedRestResource, SyncRestFunction } from './AbstractSyncedRestResource';

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

export type AugmentWithMetafieldsFunction = (
  base: AbstractSyncedRestResourceWithRestMetafields
) => Promise<FindAllResponse<Metafield>>;
// #endregion

export abstract class AbstractSyncedRestResourceWithRestMetafields extends AbstractSyncedRestResource {
  public apiData: RestApiDataWithMetafields;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource;
  public static readonly metafieldGraphQlOwnerType: MetafieldOwnerType;
  // TODO: sert à rien pour l'instant
  protected static readonly supportsDefinitions: boolean;
  protected static metafieldDefinitions: Array<MetafieldDefinition>;

  protected static augmentWithMetafieldsFunction(context: coda.ExecutionContext): AugmentWithMetafieldsFunction {
    return async (base: AbstractSyncedRestResourceWithRestMetafields) =>
      Metafield.all({ context, owner_id: base.apiData.id, owner_resource: this.metafieldRestOwnerType });
  }

  protected static async getMetafieldDefinitions(
    context: coda.ExecutionContext,
    includeFakeExtraDefinitions?: boolean
  ): Promise<Array<MetafieldDefinition>> {
    if (this.metafieldDefinitions) return this.metafieldDefinitions;

    console.log('🍏🍏🍏🍏🍏🍏🍏🍏🍏🍏 FETCH');
    return MetafieldDefinition.allForOwner({
      context,
      ownerType: this.metafieldGraphQlOwnerType,
      includeFakeExtraDefinitions,
      options: { cacheTtlSecs: CACHE_DEFAULT },
    });
    // const metafieldDefinitions = await MetafieldDefinition.allForOwner({
    //   context,
    //   ownerType: this.metafieldGraphQlOwnerType,
    //   includeFakeExtraDefinitions,
    //   options: { cacheTtlSecs: CACHE_DEFAULT },
    // });

    // return metafieldDefinitions.map((m) => m.apiData);
  }
  // protected static async getMetafieldDefinitions(
  //   context: coda.ExecutionContext,
  //   includeFakeExtraDefinitions?: boolean
  // ) {
  //   if (this.metafieldDefinitions) return this.metafieldDefinitions;
  //   this.metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(
  //     { ownerType: this.metafieldGraphQlOwnerType, includeFakeExtraDefinitions },
  //     context
  //   );
  //   return this.metafieldDefinitions;
  // }

  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ) {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableManagerRestWithRestMetafields<AbstractSyncedRestResourceWithRestMetafields>(
      schema,
      codaSyncParams,
      context
    );
  }

  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const syncTableManager = await this.getSyncTableManager(context, codaSyncParams);
    const sync = this.makeSyncTableManagerSyncFunction({ codaSyncParams, context, syncTableManager });
    const syncMetafields = this.augmentWithMetafieldsFunction(context);

    const { response, continuation } = await syncTableManager.executeSync({ sync, syncMetafields });
    return {
      result: response.data.map((data) => data.formatToRow()),
      continuation,
    };
  }

  /**
   * A special sync for Metafields Sync Tables using Rest
   */
  public static async syncMetafieldsOnly(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const syncTableManager = await this.getSyncTableManager(context, codaSyncParams);
    syncTableManager.shouldSyncMetafields = true;

    const metafieldDefinitions =
      syncTableManager.prevContinuation?.extraData?.metafieldDefinitions ??
      (await this.getMetafieldDefinitions(context, false)).map((m) => m.apiData);

    const sync: SyncRestFunction<AbstractSyncedRestResourceWithRestMetafields> = (
      nextPageQuery: SearchParams = {},
      adjustLimit?: number
    ) => {
      return this.baseFind({
        context,
        urlIds: {},
        params: {
          fields: ['id'].join(','),
          limit: adjustLimit ?? syncTableManager.shouldSyncMetafields ? 30 : REST_DEFAULT_LIMIT,
          ...nextPageQuery,
        },
      });
    };
    const syncMetafields = this.augmentWithMetafieldsFunction(context);

    let { response, continuation } = await syncTableManager.executeSync({ sync: sync, syncMetafields });
    if (continuation) {
      continuation = {
        ...continuation,
        extraData: {
          metafieldDefinitions,
        },
      } as SyncTableRestContinuation;
    }
    return {
      result: response.data.flatMap((resource) =>
        resource.apiData.metafields?.map((m: Metafield) => {
          const matchDefinition = metafieldDefinitions.find((f) => f && getMetaFieldFullKey(f) === m.fullKey);
          m.apiData.definition_id = matchDefinition ? graphQlGidToId(matchDefinition?.id) : undefined;
          return m.formatToRow();
        })
      ),
      continuation,
    };
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
      const instance: AbstractSyncedRestResourceWithRestMetafields = new (this as any)({
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
      const staticOwnerResource = this.resource<typeof AbstractSyncedRestResourceWithRestMetafields>();
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
