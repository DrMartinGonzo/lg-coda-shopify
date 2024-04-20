// #region Imports
import * as coda from '@codahq/packs-sdk';

import { SyncTableManagerRestWithRestMetafields } from '../../../SyncTableManager/Rest/SyncTableManagerRestWithRestMetafields';
import { SyncTableRestContinuation, SyncTableSyncResult } from '../../../SyncTableManager/types/SyncTable.types';
import { SyncRestFunction } from '../../../SyncTableManager/types/SyncTableManager.types';
import { PREFIX_FAKE } from '../../../constants';
import { graphQlGidToId } from '../../../utils/conversion-utils';
import { getMetaFieldFullKey } from '../../../utils/metafields-utils';
import { Metafield } from '../../Rest/Metafield';
import { FindAllRestResponse } from './AbstractRestResource';
import { AbstractSyncedRestResourceWithMetafields } from './AbstractSyncedRestResourceWithMetafields';

// #endregion

// #region Types
export type AugmentWithMetafieldsFunction = (
  base: AbstractSyncedRestResourceWithRestMetafields
) => Promise<FindAllRestResponse<Metafield>>;
// #endregion

export abstract class AbstractSyncedRestResourceWithRestMetafields extends AbstractSyncedRestResourceWithMetafields {
  protected static augmentWithMetafieldsFunction(context: coda.ExecutionContext): AugmentWithMetafieldsFunction {
    return async (base: AbstractSyncedRestResourceWithRestMetafields) =>
      Metafield.all({ context, owner_id: base.apiData.id, owner_resource: this.metafieldRestOwnerType });
  }

  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ): Promise<SyncTableManagerRestWithRestMetafields<AbstractSyncedRestResourceWithRestMetafields>> {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableManagerRestWithRestMetafields<AbstractSyncedRestResourceWithRestMetafields>({
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

    const sync: SyncRestFunction<AbstractSyncedRestResourceWithRestMetafields> = ({ nextPageQuery = {}, limit }) => {
      return this.baseFind({
        context,
        urlIds: {},
        params: {
          fields: ['id'].join(','),
          limit: syncTableManager.shouldSyncMetafields ? 30 : limit,
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
