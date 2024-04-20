// #region Imports
import { VariablesOf, readFragment } from '../../utils/tada-utils';

import { GraphQlClient, GraphQlRequestReturn } from '../../Clients/GraphQlClient';
import { AbstractSyncedRestResourceWithGraphQLMetafields } from '../../Resources/Abstract/Rest/AbstractSyncedRestResourceWithGraphQLMetafields';
import { Metafield } from '../../Resources/Rest/Metafield';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT } from '../../constants';
import { getNodesMetafieldsByKeyQuery, metafieldFieldsFragment } from '../../graphql/metafields-graphql';
import { BaseRow } from '../../schemas/CodaRows.types';
import { FieldDependency } from '../../schemas/Schema.types';
import { graphQlGidToId } from '../../utils/conversion-utils';
import { arrayUnique, logAdmin } from '../../utils/helpers';
import { splitMetaFieldFullKey } from '../../utils/metafields-utils';
import { AbstractSyncTableManagerRestWithMetafields } from '../Abstract/Rest/AbstractSyncTableManagerRestWithMetafields';
import { CurrentBatchType, SyncTableMixedContinuation } from '../types/SyncTable.types';
import {
  ExecuteRestSyncWithGraphQlMetafieldsArgs,
  ISyncTableManagerWithMetafields,
  SyncTableManagerRestResult,
} from '../types/SyncTableManager.types';
import {
  getGraphQlSyncTableMaxLimitAndDeferWait,
  skipGraphQlSyncTableRun,
  stringifyContinuationProperty,
} from '../utils/syncTableManager-utils';

// #endregion

export class SyncTableManagerRestWithGraphQlMetafields<BaseT extends AbstractSyncedRestResourceWithGraphQLMetafields>
  extends AbstractSyncTableManagerRestWithMetafields<
    BaseT,
    SyncTableMixedContinuation<ReturnType<BaseT['formatToRow']>>
  >
  implements ISyncTableManagerWithMetafields
{
  protected currentRestLimit: number;

  // ———————————————————————————————————————————————

  public getSyncedStandardFields(dependencies: Array<FieldDependency<any>>): string[] {
    // admin_graphql_api_id is necessary for metafield sync
    return arrayUnique<string>(super.getSyncedStandardFields(dependencies).concat(['admin_graphql_api_id']));
  }

  private extractCurrentBatch(items: Array<BaseRow>): CurrentBatchType {
    if (this.prevContinuation?.cursor || this.prevContinuation?.retries) {
      logAdmin(`🔁 Fetching remaining graphQL results from current batch`);
      return this.prevContinuation?.extraData?.currentBatch;
    }

    const stillProcessingRestItems = this.prevContinuation?.extraData?.currentBatch?.remaining.length > 0;
    let currentItems: Array<BaseRow> = [];
    if (stillProcessingRestItems) {
      currentItems = [...this.prevContinuation.extraData.currentBatch.remaining];
      logAdmin(`🔁 Fetching next batch of ${currentItems.length} items`);
    } else {
      currentItems = [...items];
      logAdmin(`🟢 Found ${currentItems.length} items to augment with metafields`);
    }

    return {
      processing: currentItems.splice(0, this.currentRestLimit),
      // modified 'currentItems' array after the splice operation, which now contains the elements not extracted for processing
      remaining: currentItems,
    };
  }

  private buildGraphQlMetafieldsContinuation(
    response: GraphQlRequestReturn<typeof getNodesMetafieldsByKeyQuery>,
    retries: number,
    currentBatch: CurrentBatchType
  ) {
    let continuation: typeof this.continuation | null = null;
    const unfinishedGraphQl = retries > 0 || currentBatch.remaining.length > 0;
    const unfinishedRest =
      !retries &&
      (this.continuation?.nextUrl !== undefined || this.prevContinuation?.scheduledNextRestUrl !== undefined);

    if (unfinishedGraphQl || unfinishedRest) {
      continuation = {
        // ...(continuation ?? {}),
        graphQlLock: 'true',
        retries,
        extraData: {
          ...this.extraContinuationData,
          currentBatch,
        },
        skipNextRestSync: 'true',
        scheduledNextRestUrl: this.prevContinuation?.scheduledNextRestUrl ?? this.continuation?.nextUrl,
      };

      if (unfinishedRest) {
        continuation.skipNextRestSync = 'false';
        continuation.nextUrl = this.continuation?.nextUrl ?? this.prevContinuation?.scheduledNextRestUrl;
        continuation.scheduledNextRestUrl = undefined;
      }

      if (response.body.extensions?.cost) {
        continuation.lastCost = stringifyContinuationProperty(response.body.extensions.cost);
        continuation.lastLimit = this.currentRestLimit;
      }
    }

    return continuation;
  }

  // #region Sync
  public async executeSync({
    sync,
    defaultLimit,
    getNestedData,
  }: ExecuteRestSyncWithGraphQlMetafieldsArgs<BaseT>): Promise<
    SyncTableManagerRestResult<typeof this.continuation, BaseT>
  > {
    let mainData: BaseT[] = [];

    /** ————————————————————————————————————————————————————————————
     * Check if we have budget to use GraphQL, if not defer the sync.
     * + adjust Rest sync limit
     */
    if (this.shouldSyncMetafields) {
      const syncTableMaxLimitAndDeferWait = await getGraphQlSyncTableMaxLimitAndDeferWait(
        GRAPHQL_NODES_LIMIT,
        this.prevContinuation,
        this.context
      );
      const { shouldDeferBy, limit } = syncTableMaxLimitAndDeferWait;
      if (shouldDeferBy > 0) {
        return skipGraphQlSyncTableRun(this.prevContinuation, shouldDeferBy);
      }
      this.currentRestLimit = defaultLimit ?? limit;
    }

    /** ————————————————————————————————————————————————————————————
     * Perform the main Rest Sync
     */
    const { response: mainResponse, continuation: mainContinuation } = (await this.parentSyncTableManager.executeSync({
      sync,
      defaultLimit: this.currentRestLimit,
    })) as SyncTableManagerRestResult<typeof this.continuation, BaseT>;
    mainData = getNestedData ? getNestedData(mainResponse, this.context) : mainResponse.data;
    this.continuation = mainContinuation;

    /** ————————————————————————————————————————————————————————————
     * Augment Rest sync with metafields fetched with GraphQL
     */
    if (this.shouldSyncMetafields) {
      if (this.prevContinuation?.retries) {
        const count = Math.min(mainData.length, this.currentRestLimit);
        logAdmin(`🔄 Retrying (count: ${this.prevContinuation.retries}) sync of ${count} entries…`);
      }

      const items = mainData.map((data) => data.formatToRow());
      const currentBatch = this.extractCurrentBatch(items);

      // TODO: implement cost adjustment (Mais le coût semble négligeable en utilisant une query par node)
      const documentNode = getNodesMetafieldsByKeyQuery;
      const variables = {
        metafieldKeys: this.effectiveMetafieldKeys,
        countMetafields: this.effectiveMetafieldKeys.length,
        ids: arrayUnique(currentBatch.processing.map((c) => c.admin_graphql_api_id)).sort(),
      } as VariablesOf<typeof documentNode>;

      const graphQlClient = new GraphQlClient({ context: this.context });
      const metafieldsResponse = await graphQlClient.request<typeof documentNode>({
        documentNode,
        variables,
        retries: this.prevContinuation?.retries ?? 0,
        options: { cacheTtlSecs: CACHE_DISABLED },
      });

      if (metafieldsResponse.body?.data?.nodes.length) {
        metafieldsResponse.body.data.nodes.forEach((node) => {
          const resourceMatch = mainData.find((instance) => graphQlGidToId(node.id) === instance.apiData.id);
          // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
          if (!resourceMatch) return;

          if ('metafields' in node && node.metafields.nodes.length) {
            const metafields = readFragment(metafieldFieldsFragment, node.metafields.nodes);
            resourceMatch.apiData.metafields = metafields.map((metafield) => {
              /** Metafields fetched via GraphQl have the full key, i.e.
               * `${namespace}.${key}` in their key property */
              const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafield.key);
              return new Metafield({
                context: this.context,
                fromData: { ...metafield, key: metaKey, namespace: metaNamespace },
              });
            });
          }
        });

        const metaFieldscontinuation = this.buildGraphQlMetafieldsContinuation(
          metafieldsResponse,
          metafieldsResponse.retries,
          currentBatch
        );
        if (metaFieldscontinuation) {
          this.continuation = {
            ...(this.continuation ?? {}),
            ...metaFieldscontinuation,
          };
        }
      }
    }

    return {
      response: {
        ...mainResponse,
        data: mainData,
      },
      continuation: this.continuation,
    };
  }
  // #endregion
}
