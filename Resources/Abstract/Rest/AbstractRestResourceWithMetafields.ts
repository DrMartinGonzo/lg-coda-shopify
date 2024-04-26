// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  SyncTableManagerRestWithGraphQlMetafields,
  SyncTableManagerRestWithRestMetafields,
} from '../../../SyncTableManager/Rest/SyncTableManagerRestWithMetafields';
import {
  SyncTableRestContinuation,
  SyncTableSyncResult,
  SyncTableUpdateResult,
} from '../../../SyncTableManager/types/SyncTable.types';
import { SyncRestFunction } from '../../../SyncTableManager/types/SyncTableManager.types';
import { PREFIX_FAKE } from '../../../constants';
import { BaseRow } from '../../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { graphQlGidToId } from '../../../utils/conversion-utils';
import { getMetaFieldFullKey } from '../../../utils/metafields-utils';
import { MetafieldDefinition } from '../../GraphQl/MetafieldDefinition';
import { MetafieldHelper } from '../../Mixed/MetafieldHelper';
import { Metafield, SupportedMetafieldOwnerResource } from '../../Rest/Metafield';
import { hasMetafieldsInRow, hasMetafieldsInUpdate } from '../../utils/abstractResource-utils';
import { AbstractRestResource, FindAllRestResponse, RestApiData, SaveArgs } from './AbstractRestResource';

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
  base: AbstractRestResourceWithRestMetafields
) => Promise<FindAllRestResponse<Metafield>>;
// #endregion

abstract class AbstractRestResourceWithMetafields extends AbstractRestResource {
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
  protected static augmentWithMetafieldsFunction(context: coda.ExecutionContext): AugmentWithMetafieldsFunction {
    return async (base: AbstractRestResourceWithRestMetafields) =>
      Metafield.all({ context, owner_id: base.apiData.id, owner_resource: this.metafieldRestOwnerType });
  }

  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ): Promise<SyncTableManagerRestWithRestMetafields<AbstractRestResourceWithRestMetafields>> {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableManagerRestWithRestMetafields<AbstractRestResourceWithRestMetafields>({
      schema,
      codaSyncParams,
      context,
    });
  }

  public static async sync(
    codaSyncParams: coda.ParamValues<coda.ParamDefs>,
    context: coda.SyncExecutionContext
  ): Promise<SyncTableSyncResult> {
    const syncTableManager = await this.getSyncTableManager(context, codaSyncParams);
    const sync = this.makeSyncTableManagerSyncFunction({ codaSyncParams, context, syncTableManager });
    const syncMetafields = this.augmentWithMetafieldsFunction(context);

    const { response, continuation } = await syncTableManager.executeSync({
      sync,
      syncMetafields,
      defaultLimit: this.defaultLimit,
    });
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
      (await this.getMetafieldDefinitions(context)).map((m) => m.apiData);

    const sync: SyncRestFunction<AbstractRestResourceWithRestMetafields> = ({ nextPageQuery = {}, limit }) => {
      const params = this.allIterationParams({
        context,
        nextPageQuery,
        limit: syncTableManager.shouldSyncMetafields ? 30 : limit,
        firstPageParams: { fields: ['id'].join(',') },
      });
      return this.all(params);
    };
    const syncMetafields = this.augmentWithMetafieldsFunction(context);

    let { response, continuation } = await syncTableManager.executeSync({ sync: sync, syncMetafields });
    if (continuation) {
      continuation = {
        ...continuation,
        extraData: {
          metafieldDefinitions: metafieldDefinitions.map((def) => ({ id: def.id })),
        },
      } as SyncTableRestContinuation;
    }
    return {
      result: response.data.flatMap((resource) =>
        resource.apiData.metafields?.map((m: Metafield) => {
          const matchDefinition = metafieldDefinitions.find((f) => f && getMetaFieldFullKey(f) === m.fullKey);
          if (matchDefinition && matchDefinition.id) {
            // Edge case, definition id can be a fake id
            if (!(typeof matchDefinition.id === 'string' && matchDefinition.id.startsWith(PREFIX_FAKE))) {
              m.apiData.definition_id = graphQlGidToId(matchDefinition.id);
            }
          }
          return m.formatToRow();
        })
      ),
      continuation,
    };
  }
}

export abstract class AbstractRestResourceWithGraphQLMetafields extends AbstractRestResourceWithMetafields {
  // prettier-ignore
  public static async getSyncTableManager<BaseT extends AbstractRestResourceWithGraphQLMetafields = AbstractRestResourceWithGraphQLMetafields>(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ) {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableManagerRestWithGraphQlMetafields<BaseT>({
      schema,
      codaSyncParams,
      context,
    });
  }
}
