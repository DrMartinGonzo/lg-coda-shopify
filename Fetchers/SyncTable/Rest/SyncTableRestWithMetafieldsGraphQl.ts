// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { VariablesOf, readFragment } from '../../../utils/graphql';

import { GRAPHQL_NODES_LIMIT } from '../../../constants';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  graphQlGidToId,
  idToGraphQlGid,
  makeGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../../helpers-graphql';
import { ResourceWithMetafields } from '../../../resources/Resource.types';
import {
  getNodesMetafieldsByKeyQuery,
  metafieldFieldsFragment,
} from '../../../resources/metafields/metafields-graphql';
import { formatMetaFieldValueForSchema } from '../../../resources/metafields/utils/metafields-utils-formatToRow';
import {
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
} from '../../../resources/metafields/utils/metafields-utils-keys';
import { RowWithMetafields } from '../../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { arrayUnique, logAdmin } from '../../../utils/helpers';
import { GraphQlFetchTadaResponse } from '../../Client/GraphQl/GraphQlClient';
import { RestClientWithGraphQlMetafields } from '../../Client/Rest/RestClientWithSchemaWithGraphQlMetafields';
import { stringifyContinuationProperty } from '../../fetcher-helpers';
import { SyncTableMixedContinuation, CurrentBatchType } from '../SyncTable.types';
import { SyncTableRestWithMetafields } from './_SyncTableRestWithMetafields';

// #endregion

export abstract class SyncTableRestWithMetafieldsGraphQl<
  ResourceT extends ResourceWithMetafields<any, any>
> extends SyncTableRestWithMetafields<ResourceT> {
  metafieldOwnerType: MetafieldOwnerType;

  constructor(
    resource: ResourceT,
    fetcher: RestClientWithGraphQlMetafields<ResourceT>,
    schema: coda.ArraySchema<coda.Schema>,
    codaParams: coda.ParamValues<coda.ParamDefs>
  ) {
    super(resource, fetcher, schema, codaParams);
  }

  // #region Sync
  // private handleShopifyMaxExceededError(error: ShopifyMaxExceededError, currentBatch: currentBatchType) {
  //   const { result, continuation } = handleShopifyMaxExceededError(
  //     error,
  //     this.restLimit,
  //     this.prevContinuation,
  //     this.extraContinuationData
  //   );

  //   const errorContinuation: SyncTableMixedContinuation = {
  //     ...continuation,
  //     skipNextRestSync: 'true',
  //     extraContinuationData: {
  //       ...continuation.extraContinuationData,
  //       currentBatch,
  //     },
  //     scheduledNextRestUrl: this.prevContinuation?.scheduledNextRestUrl ?? this.continuation?.nextUrl,
  //   };

  //   // const maxCostError = error.originalError;
  //   // const { maxCost, cost } = maxCostError.extensions;
  //   // const diminishingFactor = 0.75;
  //   // const reducedMaxEntriesPerRun = Math.min(
  //   //   GRAPHQL_NODES_LIMIT,
  //   //   Math.max(1, Math.floor((maxCost / cost) * this.restLimit * diminishingFactor))
  //   // );

  //   // const errorContinuation: SyncTableMixedContinuation = {
  //   //   ...this.prevContinuation,
  //   //   graphQlLock: 'true',
  //   //   retries: (this.prevContinuation?.retries ?? 0) + 1,
  //   //   skipNextRestSync: 'true',
  //   //   extraContinuationData: {
  //   //     ...this.extraContinuationData,
  //   //     currentBatch,
  //   //   },
  //   //   scheduledNextRestUrl: this.prevContinuation?.scheduledNextRestUrl ?? this.continuation?.nextUrl,
  //   //   reducedMaxEntriesPerRun: reducedMaxEntriesPerRun,
  //   // };

  //   // console.log(
  //   //   `🎚️ ${error.message} Adjusting next query to run with ${errorContinuation.reducedMaxEntriesPerRun} max entries.`
  //   // );

  //   return {
  //     response: undefined,
  //     continuation: errorContinuation,
  //   };
  // }

  private extractCurrentBatch(): CurrentBatchType<ResourceT['codaRow']> {
    if (this.prevContinuation?.cursor || this.prevContinuation?.retries) {
      logAdmin(`🔁 Fetching remaining graphQL results from current batch`);
      return this.prevContinuation?.extraContinuationData?.currentBatch;
    }

    const stillProcessingRestItems = this.prevContinuation?.extraContinuationData?.currentBatch?.remaining.length > 0;
    let currentItems: typeof this.items = [];
    if (stillProcessingRestItems) {
      currentItems = [...this.prevContinuation.extraContinuationData.currentBatch.remaining];
      logAdmin(`🔁 Fetching next batch of ${currentItems.length} items`);
    } else {
      currentItems = [...this.items];
      logAdmin(`🟢 Found ${currentItems.length} items to augment with metafields`);
    }

    return {
      processing: currentItems.splice(0, this.restLimit),
      // modified 'currentItems' array after the splice operation, which now contains the elements not extracted for processing
      remaining: currentItems,
    };
  }

  private buildGraphQlMetafieldsContinuation(
    response: GraphQlFetchTadaResponse<typeof getNodesMetafieldsByKeyQuery>,
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
        continuation.lastMaxEntriesPerRun = this.restLimit;
      }
    }

    return continuation;
  }

  private convertRestIdToGid(id: string | number) {
    return idToGraphQlGid(this.resource.graphQl.name, id);
  }

  private async makeMetafieldsRequest(): Promise<{
    response: GraphQlFetchTadaResponse<typeof getNodesMetafieldsByKeyQuery>;
    continuation: SyncTableMixedContinuation | null;
  }> {
    const count = Math.min(this.items.length, this.restLimit);
    if (this.prevContinuation?.retries) {
      logAdmin(`🔄 Retrying (count: ${this.prevContinuation.retries}) sync of ${count} entries…`);
    }
    logAdmin(`✨  GraphQL Admin API: Augmenting ${count} entries with metafields…`);

    const currentBatch = this.extractCurrentBatch();

    // TODO: implement cost adjustment
    // Mais le coût semble négligeable en utilisant une query par node
    const payload = {
      query: printGql(getNodesMetafieldsByKeyQuery),
      variables: {
        metafieldKeys: this.effectiveMetafieldKeys,
        countMetafields: this.effectiveMetafieldKeys.length,
        ids: arrayUnique(currentBatch.processing.map((c) => c.id))
          .sort()
          .map((id) => this.convertRestIdToGid(id)),
      } as VariablesOf<typeof getNodesMetafieldsByKeyQuery>,
    };

    const { response, retries } = await makeGraphQlRequest<typeof getNodesMetafieldsByKeyQuery>(
      { payload, retries: this.prevContinuation?.retries ?? 0 },
      this.context
    );
    const continuation = this.buildGraphQlMetafieldsContinuation(response, retries, currentBatch);
    return {
      response,
      continuation,
    };

    // try {
    //   let { response, retries } = await makeGraphQlRequest<ResultOf<typeof getNodesMetafieldsByKeyQuery>>(
    //     { payload, retries: this.prevContinuation?.retries ?? 0 },
    //     this.context
    //   );
    //   const continuation = this.buildGraphQlMetafieldsContinuation(response, retries, currentBatch);
    //   return {
    //     response,
    //     continuation,
    //   };
    // } catch (error) {
    //   if (error instanceof ShopifyMaxExceededError) {
    //     return this.handleShopifyMaxExceededError(error, currentBatch);
    //   } else {
    //     throw error;
    //   }
    // }
  }

  async executeSync() {
    if (this.shouldSyncMetafields) {
      const syncTableMaxEntriesAndDeferWait = await getGraphQlSyncTableMaxEntriesAndDeferWait(
        GRAPHQL_NODES_LIMIT,
        this.prevContinuation,
        this.context
      );
      const { shouldDeferBy } = syncTableMaxEntriesAndDeferWait;
      if (shouldDeferBy > 0) {
        return skipGraphQlSyncTableRun(this.prevContinuation as any, shouldDeferBy);
      }
      this.restLimit = syncTableMaxEntriesAndDeferWait.maxEntriesPerRun;
    }

    const mainResults = await this.mainSync();
    if (this.shouldSyncMetafields) {
      return this.augmentSyncWithMetafields();
    }

    return mainResults;

    // const skipNextRestSync = this.prevContinuation?.skipNextRestSync === 'true';

    // // Rest Admin API Sync
    // if (!skipNextRestSync) {
    //   this.beforeSync();
    //   const response = await this.makeSyncRequest({ url: this.syncUrl });
    //   this.afterSync(response);
    //   return {
    //     result: this.items,
    //     continuation: this.continuation,
    //   };
    // }

    // return {
    //   result: [],
    // };
  }

  // async executeUpdate(updates: Array<coda.SyncUpdate<string, string, ResourceT['schema']>>) {
  //   const metafieldDefinitions = hasMetafieldsInUpdates(updates)
  //     ? await fetchMetafieldDefinitionsGraphQl({ ownerType: this.metafieldOwnerType }, this.context)
  //     : [];

  //   const completed = await Promise.allSettled(
  //     updates.map(async (update) => {
  //       // TODO: extract this to a helper ?
  //       const includedProperties = update.updatedFields.concat([
  //         getObjectSchemaEffectiveKey(this.resource.schema, this.resource.schema.idProperty),
  //       ]);
  //       const previousRow = update.previousValue as ResourceT['codaRow'];
  //       const newRow = Object.fromEntries(
  //         Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
  //       ) as ResourceT['codaRow'];

  //       const metafieldSets = await getMetafieldKeyValueSetsFromUpdate(newRow, metafieldDefinitions, this.context);
  //       const restUpdate = this.fetcher.formatRowToApi(newRow);
  //       const updatedRow = await this.fetcher.updateAndFormatToRow({
  //         id: newRow.id,
  //         restUpdate,
  //         metafieldSets,
  //       });

  //       return {
  //         ...previousRow,
  //         ...updatedRow,
  //       };
  //     })
  //   );

  //   return {
  //     result: completed.map((job) => {
  //       if (job.status === 'fulfilled') return job.value;
  //       else return job.reason;
  //     }),
  //   };
  // }
  // #endregion

  // #region Augmented Metafields Sync
  async augmentSyncWithMetafields() {
    const { response, continuation } = await this.makeMetafieldsRequest();

    if (response?.body?.data?.nodes.length) {
      const augmentedItems = response.body.data.nodes
        .map((node) => {
          const resourceMatch = this.items.find((resource) => graphQlGidToId(node.id) === resource.id);

          // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
          if (!resourceMatch) return;

          const updatedresource = { ...resourceMatch } as RowWithMetafields<ResourceT['codaRow']>;
          if ('metafields' in node && node.metafields.nodes) {
            const metafields = readFragment(metafieldFieldsFragment, node.metafields.nodes);
            metafields.forEach((metafield) => {
              const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
              (updatedresource as any)[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
            });
          }
          return updatedresource;
        })
        .filter(Boolean);

      return {
        result: augmentedItems,
        continuation,
      };
    }

    return {
      result: this.items,
      continuation,
    };
  }
  // #endregion
}
