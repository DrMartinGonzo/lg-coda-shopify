// #region Imports
import { VariablesOf, readFragment } from '../../utils/graphql';

import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT } from '../../constants';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  graphQlGidToId,
  skipGraphQlSyncTableRun,
} from '../../helpers-graphql';
import { getNodesMetafieldsByKeyQuery, metafieldFieldsFragment } from '../../resources/metafields/metafields-graphql';
import { splitMetaFieldFullKey } from '../../resources/metafields/utils/metafields-utils-keys';
import { BaseRow } from '../../schemas/CodaRows.types';
import { FieldDependency } from '../../schemas/Schema.types';
import { arrayUnique, handleFieldDependencies, logAdmin } from '../../utils/helpers';
import { CurrentBatchType, SyncTableMixedContinuation } from '../SyncTable/SyncTable.types';
import { stringifyContinuationProperty } from '../fetcher-helpers';
import { FindAllResponse } from './AbstractResource';
import { AbstractResource_Synced } from './AbstractResource_Synced';
import { AbstractResource_Synced_HasMetafields_GraphQl } from './AbstractResource_Synced_HasMetafields_GraphQl';
import { AbstractSyncTableRestHasMetafields } from './AbstractSyncTableRestHasMetafields';
import { GraphQlClientNEW, GraphQlRequestReturn } from './GraphQlClientNEW';
import { Metafield } from './Resources/Metafield';
import { ExecuteSyncArgs, SyncTableManagerResult } from './SyncTableRestNew';

// #endregion

export class SyncTableRestHasGraphQlMetafields<
  BaseT extends AbstractResource_Synced
> extends AbstractSyncTableRestHasMetafields<BaseT> {
  protected currentRestLimit: number;
  // ———————————————————————————————————————————————

  public getSyncedStandardFields(dependencies: Array<FieldDependency<any>>): string[] {
    // admin_graphql_api_id is necessary for metafield sync
    return handleFieldDependencies(this.effectiveStandardFromKeys, dependencies, ['admin_graphql_api_id']);
  }

  private extractCurrentBatch(items: Array<BaseRow>): CurrentBatchType {
    if (this.prevContinuation?.cursor || this.prevContinuation?.retries) {
      logAdmin(`🔁 Fetching remaining graphQL results from current batch`);
      return this.prevContinuation?.extraContinuationData?.currentBatch;
    }

    const stillProcessingRestItems = this.prevContinuation?.extraContinuationData?.currentBatch?.remaining.length > 0;
    let currentItems: Array<BaseRow> = [];
    if (stillProcessingRestItems) {
      currentItems = [...this.prevContinuation.extraContinuationData.currentBatch.remaining];
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
    let continuation: SyncTableMixedContinuation | null = null;
    const unfinishedGraphQl = retries > 0 || currentBatch.remaining.length > 0;
    const unfinishedRest =
      !retries &&
      (this.continuation?.nextUrl !== undefined || this.prevContinuation?.scheduledNextRestUrl !== undefined);

    if (unfinishedGraphQl || unfinishedRest) {
      continuation = {
        // ...(continuation ?? {}),
        graphQlLock: 'true',
        retries,
        extraContinuationData: {
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
        continuation.lastMaxEntriesPerRun = this.currentRestLimit;
      }
    }

    return continuation;
  }

  // #region Sync
  public getMainData(response: FindAllResponse<AbstractResource_Synced>) {
    return response.data;
  }

  public async executeSync({ sync, adjustLimit, getNestedData }: ExecuteSyncArgs): Promise<SyncTableManagerResult> {
    let mainData: Array<AbstractResource_Synced_HasMetafields_GraphQl> = [];

    /** ————————————————————————————————————————————————————————————
     * Check if we have budget to use GraphQL, if not defer the sync.
     * + adjust Rest sync limit
     */
    if (this.shouldSyncMetafields) {
      const syncTableMaxEntriesAndDeferWait = await getGraphQlSyncTableMaxEntriesAndDeferWait(
        GRAPHQL_NODES_LIMIT,
        this.prevContinuation,
        this.context
      );
      const { shouldDeferBy, maxEntriesPerRun } = syncTableMaxEntriesAndDeferWait;
      if (shouldDeferBy > 0) {
        return skipGraphQlSyncTableRun(this.prevContinuation as any, shouldDeferBy);
      }
      this.currentRestLimit = adjustLimit ?? maxEntriesPerRun;
    }

    /** ————————————————————————————————————————————————————————————
     * Perform the main Rest Sync
     */
    const { response: mainResponse, continuation: mainContinuation } = await super.executeSync({
      sync,
      adjustLimit: this.currentRestLimit,
    });
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

      const graphQlClient = new GraphQlClientNEW({ context: this.context });
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
      // TODO: make it better
      response: {
        ...mainResponse,
        data: mainData,
        headers: mainResponse.headers,
        pageInfo: mainResponse.pageInfo,
      },
      continuation: this.continuation,
    };
  }
  // #endregion
}
