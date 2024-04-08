// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../../../utils/graphql';

import { TadaDocumentNode } from 'gql.tada';
import {
  calcSyncTableMaxEntriesPerRunNew,
  checkThrottleStatus,
  idToGraphQlGid,
  makeGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../../helpers-graphql';
import { GraphQlData } from '../../Client/GraphQl/GraphQlClient';
import { ResourceUnion, ResourceWithSchemaUnion } from '../../../resources/Resource.types';
import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../../../resources/metafields/metafields-helpers';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { flattenConnection, logAdmin } from '../../../utils/helpers';
import { GraphQlClientWithSchema } from '../../Client/GraphQl/GraphQlClientWithSchema';
import { GraphQlResourceName } from '../../ShopifyGraphQlResource.types';
import { SyncTableGraphQlContinuationNew, SyncTableSyncResult } from '../SyncTable.types';
import { parseContinuationProperty, stringifyContinuationProperty } from '../Rest/SyncTableRest';
import { GraphQlFetchTadaResponse } from '../../Client/GraphQl/GraphQlClient';

// #endregion

export abstract class SyncTableGraphQl<ResourceT extends ResourceWithSchemaUnion> {
  protected readonly context: coda.ExecutionContext;

  readonly resource: ResourceT;
  readonly fetcher: GraphQlClientWithSchema<ResourceT>;
  readonly useGraphQlForMetafields: boolean;
  readonly metafieldOwnerType: MetafieldOwnerType;
  /** Array of Coda formula parameters */
  readonly codaParams: coda.ParamValues<coda.ParamDefs>;
  /** The corresponding GraphQlResource Name of this Rest resource */
  readonly graphQlResourceName: GraphQlResourceName;

  effectivePropertyKeys: string[];
  effectiveStandardFromKeys: string[];
  effectiveMetafieldKeys: string[];
  shouldSyncMetafields: boolean;
  maxEntriesPerRun: number;
  initalMaxEntriesPerRun = 50;

  /** The GraphQl document for the current sync */
  documentNode: TadaDocumentNode;
  /** The GraphQl variables for the current sync */
  variables: VariablesOf<TadaDocumentNode>;

  /** Formatted items result */
  items: Array<ResourceT['codaRow']> = [];
  /** The continuation from the previous sync */
  prevContinuation: SyncTableGraphQlContinuationNew;
  /** The continuation from the current sync */
  continuation: SyncTableGraphQlContinuationNew;
  extraContinuationData: any = {};

  constructor(
    resource: ResourceT,
    fetcher: GraphQlClientWithSchema<ResourceT>,
    codaParams: coda.ParamValues<coda.ParamDefs>
  ) {
    this.resource = resource;
    this.fetcher = fetcher;
    this.context = this.fetcher.context;
    this.codaParams = codaParams;
    this.useGraphQlForMetafields = 'metafields' in resource ? resource.metafields.useGraphQl : undefined;
    this.metafieldOwnerType = 'metafields' in resource ? resource.metafields.ownerType : undefined;
    if ('graphQl' in resource) {
      this.graphQlResourceName = resource.graphQl.name;
    }
  }

  // private handleShopifyMaxExceededError(error: ShopifyMaxExceededError): SyncTableSyncResult {
  //   return handleShopifyMaxExceededError(
  //     error,
  //     this.maxEntriesPerRun,
  //     this.prevContinuation,
  //     this.extraContinuationData
  //   );

  //   // const maxCostError = error.originalError;
  //   // const { maxCost, cost } = maxCostError.extensions;
  //   // const diminishingFactor = 0.75;
  //   // const reducedMaxEntriesPerRun = Math.min(
  //   //   GRAPHQL_NODES_LIMIT,
  //   //   Math.max(1, Math.floor((maxCost / cost) * this.maxEntriesPerRun * diminishingFactor))
  //   // );

  //   // const errorContinuation: SyncTableGraphQlContinuationNew = {
  //   //   ...this.prevContinuation,
  //   //   graphQlLock: 'true',
  //   //   retries: (this.prevContinuation?.retries ?? 0) + 1,
  //   //   extraContinuationData: {
  //   //     ...this.extraContinuationData,
  //   //   },
  //   //   scheduledNextRestUrl: this.prevContinuation?.scheduledNextRestUrl ?? this.continuation?.nextUrl,
  //   //   reducedMaxEntriesPerRun: reducedMaxEntriesPerRun,
  //   // };

  //   // console.log(
  //   //   `🎚️ ${error.message} Adjusting next query to run with ${errorContinuation.reducedMaxEntriesPerRun} max entries.`
  //   // );

  //   // return {
  //   //   result: [],
  //   //   continuation: errorContinuation,
  //   // };
  // }

  // #region Sync:Before
  beforeSync() {
    this.setPayload();
  }

  abstract setPayload(): void;
  validatePayload(): Boolean {
    return true;
  }

  // #endregion

  // #region Sync
  // TODO: handle ShopifyMaxExceededError
  async makeSyncRequest(): Promise<{
    response: GraphQlFetchTadaResponse<typeof this.documentNode>;
    retries: number;
  }> {
    logAdmin(`🚀  GraphQL Admin API: Starting ${this.resource.display} sync…`);
    return makeGraphQlRequest<typeof this.documentNode>(
      {
        payload: {
          query: printGql(this.documentNode),
          variables: this.variables,
        },
        retries: this.prevContinuation?.retries ?? 0,
      },
      this.fetcher.context
    );
  }

  // private extractCurrentBatch(): currentBatchType<ResourceT['codaRow']> {
  //   if (this.prevContinuation?.cursor || this.prevContinuation?.retries) {
  //     logAdmin(`🔁 Fetching remaining graphQL results from current batch`);
  //     return this.prevContinuation?.extraContinuationData?.currentBatch;
  //   }

  //   const stillProcessingRestItems = this.prevContinuation?.extraContinuationData?.currentBatch?.remaining.length > 0;
  //   let currentItems: typeof this.items = [];
  //   if (stillProcessingRestItems) {
  //     currentItems = [...this.prevContinuation.extraContinuationData.currentBatch.remaining];
  //     logAdmin(`🔁 Fetching next batch of ${currentItems.length} items`);
  //   } else {
  //     currentItems = [...this.items];
  //     logAdmin(`🟢 Found ${currentItems.length} items to augment with metafields`);
  //   }

  //   return {
  //     processing: currentItems.splice(0, this.restLimit),
  //     // modified 'currentItems' array after the splice operation, which now contains the elements not extracted for processing
  //     remaining: currentItems,
  //   };
  // }

  // private buildGraphQlMetafieldsContinuation(
  //   response: coda.FetchResponse<GraphQlResponse<ResultOf<typeof queryNodesMetafieldsByKey>>>,
  //   retries: number,
  //   currentBatch: currentBatchType
  // ) {
  //   let continuation: SyncTableGraphQlContinuationNew | null = null;
  //   const unfinishedGraphQl = retries > 0 || currentBatch.remaining.length > 0;
  //   const unfinishedRest =
  //     !retries &&
  //     (this.continuation?.nextUrl !== undefined || this.prevContinuation?.scheduledNextRestUrl !== undefined);

  //   if (unfinishedGraphQl || unfinishedRest) {
  //     continuation = {
  //       // ...(continuation ?? {}),
  //       graphQlLock: 'true',
  //       retries,
  //       extraContinuationData: {
  //         ...this.extraContinuationData,
  //         currentBatch,
  //       },
  //       skipNextRestSync: 'true',
  //       scheduledNextRestUrl: this.prevContinuation?.scheduledNextRestUrl ?? this.continuation?.nextUrl,
  //     };

  //     if (unfinishedRest) {
  //       continuation.skipNextRestSync = 'false';
  //       continuation.nextUrl = this.continuation?.nextUrl ?? this.prevContinuation?.scheduledNextRestUrl;
  //       continuation.scheduledNextRestUrl = undefined;
  //     }

  //     if (response.body.extensions?.cost) {
  //       continuation.lastCost = stringifyContinuationProperty(response.body.extensions.cost);
  //       continuation.lastMaxEntriesPerRun = this.restLimit;
  //     }
  //   }

  //   return continuation;
  // }

  private convertRestIdToGid(id: string | number) {
    return idToGraphQlGid(this.graphQlResourceName, id);
  }

  // private async makeGraphQlMetafieldsRequest(): Promise<{
  //   response: coda.FetchResponse<GraphQlResponse<ResultOf<typeof queryNodesMetafieldsByKey>>>;
  //   continuation: SyncTableGraphQlContinuationNew | null;
  // }> {
  //   const count = Math.min(this.items.length, this.restLimit);
  //   if (this.prevContinuation?.retries) {
  //     logAdmin(`🔄 Retrying (count: ${this.prevContinuation.retries}) sync of ${count} entries…`);
  //   }
  //   logAdmin(`✨  GraphQL Admin API: Augmenting ${count} entries with metafields…`);

  //   const currentBatch = this.extractCurrentBatch();

  //   // TODO: implement cost adjustment
  //   // Mais le coût semble négligeable en utilisant une query par node
  //   const payload = {
  //     query: printGql(queryNodesMetafieldsByKey),
  //     variables: {
  //       metafieldKeys: this.effectiveMetafieldKeys,
  //       countMetafields: this.effectiveMetafieldKeys.length,
  //       ids: arrayUnique(currentBatch.processing.map((c) => c.id))
  //         .sort()
  //         .map((id) => this.convertRestIdToGid(id)),
  //     } as VariablesOf<typeof queryNodesMetafieldsByKey>,
  //   };

  //   try {
  //     let { response, retries } = await makeGraphQlRequest<ResultOf<typeof queryNodesMetafieldsByKey>>(
  //       { payload, retries: this.prevContinuation?.retries ?? 0 },
  //       this.fetcher.context
  //     );
  //     const continuation = this.buildGraphQlMetafieldsContinuation(response, retries, currentBatch);
  //     return {
  //       response,
  //       continuation,
  //     };
  //   } catch (error) {
  //     if (error instanceof ShopifyMaxExceededError) {
  //       return this.handleShopifyMaxExceededError(error, currentBatch);
  //     } else {
  //       throw error;
  //     }
  //   }
  // }

  // private async getGraphQlMaxEntriesAndDeferWait(defaultMaxEntriesPerRun: number) {
  //   const previousLockAcquired = this.prevContinuation?.graphQlLock
  //     ? this.prevContinuation.graphQlLock === 'true'
  //     : false;
  //   const throttleStatus = await checkThrottleStatus(this.fetcher.context);
  //   const { currentlyAvailable, maximumAvailable } = throttleStatus;

  //   let maxEntriesPerRun: number;
  //   let shouldDeferBy = 0;

  //   if (previousLockAcquired) {
  //     if (this.prevContinuation?.reducedMaxEntriesPerRun) {
  //       maxEntriesPerRun = this.prevContinuation.reducedMaxEntriesPerRun;
  //     } else if (this.prevContinuation?.lastCost && this.prevContinuation?.lastMaxEntriesPerRun !== undefined) {
  //       const previousCost = parseContinuationProperty(this.prevContinuation.lastCost);
  //       maxEntriesPerRun = calcSyncTableMaxEntriesPerRunNew(
  //         previousCost,
  //         this.prevContinuation.lastMaxEntriesPerRun,
  //         throttleStatus
  //       );
  //     } else {
  //       maxEntriesPerRun = defaultMaxEntriesPerRun;
  //     }
  //   } else {
  //     const minPointsNeeded = maximumAvailable - 1;
  //     shouldDeferBy = currentlyAvailable < minPointsNeeded ? 3000 : 0;
  //     maxEntriesPerRun = defaultMaxEntriesPerRun;

  //     if (shouldDeferBy > 0) {
  //       logAdmin(
  //         `🚫 Not enough points (${currentlyAvailable}/${minPointsNeeded}). Skip and wait ${shouldDeferBy / 1000}s`
  //       );
  //     }
  //   }

  //   return {
  //     maxEntriesPerRun,
  //     shouldDeferBy,
  //   };
  // }

  async executeSync(schema: any): Promise<SyncTableSyncResult> {
    const { context } = this.fetcher;
    this.prevContinuation = context.sync.continuation as SyncTableGraphQlContinuationNew;
    this.continuation = null;
    const defaultMaxEntriesPerRun = this.initalMaxEntriesPerRun;

    // const { maxEntriesPerRun, shouldDeferBy } = await this.getGraphQlMaxEntriesAndDeferWait(defaultMaxEntriesPerRun);
    const { maxEntriesPerRun, shouldDeferBy } = await this.fetcher.getGraphQlMaxEntriesAndDeferWait(
      defaultMaxEntriesPerRun,
      this.prevContinuation
    );
    if (shouldDeferBy > 0) {
      // TODO: fix `any` type
      return skipGraphQlSyncTableRun(this.prevContinuation as any, shouldDeferBy);
    }

    this.effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
    const separatedKeys = separatePrefixedMetafieldsKeysFromKeys(this.effectivePropertyKeys);
    this.effectiveStandardFromKeys = separatedKeys.standardFromKeys;
    this.effectiveMetafieldKeys = separatedKeys.prefixedMetafieldFromKeys.map(removePrefixFromMetaFieldKey);
    this.shouldSyncMetafields = !!this.effectiveMetafieldKeys.length;

    // this.maxEntriesPerRun = 500;
    this.maxEntriesPerRun = maxEntriesPerRun;

    // if (this.shouldSyncMetafields) {
    //   if (this.useGraphQlForMetafields) {
    //     const syncTableMaxEntriesAndDeferWait = await this.getGraphQlMaxEntriesAndDeferWait(GRAPHQL_NODES_LIMIT);
    //     const { shouldDeferBy } = syncTableMaxEntriesAndDeferWait;
    //     if (shouldDeferBy > 0) {
    //       // TODO: fix `any` type
    //       return skipGraphQlSyncTableRun(this.prevContinuation as any, shouldDeferBy);
    //     }
    //     this.restLimit = syncTableMaxEntriesAndDeferWait.maxEntriesPerRun;
    //   } else {
    //     this.restLimit = 30;
    //   }
    // }

    // const skipNextRestSync = this.prevContinuation?.skipNextRestSync === 'true';
    // Rest Admin API Sync
    // if (!skipNextRestSync) {
    this.beforeSync();
    this.validatePayload();

    // try {
    //   const { response, retries } = await this.makeSyncRequest();
    //   const afterSync = this.afterSync(response);

    //   this.items = afterSync.items;
    //   this.continuation = afterSync.continuation;

    //   // if (!this.shouldSyncMetafields) {
    //   return {
    //     result: this.items,
    //     continuation: this.continuation,
    //   };
    // } catch (error) {
    //   console.log('error', error);
    //   if (error instanceof ShopifyMaxExceededError) {
    //     return this.handleShopifyMaxExceededError(error);
    //   } else {
    //     throw error;
    //   }
    // }

    // const { response, retries } = await this.makeSyncRequest();

    const { response, continuation } = await this.fetcher.fetchData(
      this.documentNode,
      this.variables,
      {},
      this.prevContinuation
    );

    this.items = this.handleSyncTableResponse(response as any);
    // console.log('this.items', this.items);
    this.continuation = continuation;
    console.log('this.continuation', this.continuation);

    // const afterSync = this.afterSync(response);

    // this.items = afterSync.items;
    // this.continuation = afterSync.continuation;

    // if (!this.shouldSyncMetafields) {
    return {
      result: this.items,
      continuation: this.continuation,
    };

    // // if (!this.shouldSyncMetafields) {
    // return {
    //   result: this.items,
    //   continuation: this.continuation,
    // };
    // }
    // }

    // if (this.shouldSyncMetafields) {
    //   return this.useGraphQlForMetafields
    //     ? this.augmentSyncWithGraphQlMetafields()
    //     : this.augmentSyncWithRestMetafields();
    // }

    // return {
    //   result: [],
    // };
  }

  // executeUpdate = async (updates: Array<coda.SyncUpdate<string, string, ResourceT['schema']>>) => {
  //   const metafieldDefinitions =
  //     !!this.metafieldOwnerType && hasMetafieldsInUpdates(updates)
  //       ? await fetchMetafieldDefinitionsGraphQl({ ownerType: this.metafieldOwnerType }, this.fetcher.context)
  //       : [];

  //   const completed = await Promise.allSettled(
  //     updates.map(async (update) => this.fetcher.handleUpdateJob(update, metafieldDefinitions))
  //   );
  //   return {
  //     result: completed.map((job) => {
  //       if (job.status === 'fulfilled') return job.value;
  //       else return job.reason;
  //     }),
  //   };
  // };
  // #endregion

  // #region Sync:After
  handleSyncTableResponse = (
    response: GraphQlFetchTadaResponse<typeof this.documentNode>
  ): Array<ResourceT['codaRow']> => {
    // const { formatApiToRow } = this.fetcher;
    const { plural, singular } = this.resource.graphQl;
    const resourceKey = plural;
    console.log('resourceKey', resourceKey);

    if (response?.body?.data[resourceKey]) {
      const items = flattenConnection(response.body.data[resourceKey]);
      if (items && items.length) {
        return items.map((item) => this.fetcher.formatApiToRow(item));
      }
    }
    // console.log('items', items);

    // const data = response?.body[resourceKey];

    return [] as Array<ResourceT['codaRow']>;
  };

  afterSync(response: GraphQlFetchTadaResponse<typeof this.documentNode>) {
    this.items = this.handleSyncTableResponse(response as any);

    // Check if we have paginated results
    let retries = 0; // TODO: implement retries
    const pageInfo = GraphQlClientWithSchema.getPageInfo(response.body);
    const hasNextRun = retries > 0 || (pageInfo && pageInfo.hasNextPage);

    this.continuation = null;

    if (hasNextRun) {
      this.continuation = {
        graphQlLock: 'true',
        retries,
        extraContinuationData: this.extraContinuationData,
      };

      if (pageInfo && pageInfo.hasNextPage) {
        this.continuation = {
          ...this.continuation,
          cursor: pageInfo.endCursor,
        };
      }
      if (response.body.extensions?.cost) {
        this.continuation = {
          ...this.continuation,
          lastCost: stringifyContinuationProperty(response.body.extensions.cost),
          lastMaxEntriesPerRun: this.maxEntriesPerRun,
        };
      }
    }

    return { items: this.items, continuation: this.continuation };
  }
  // #endregion

  // #region Augmented Metafields Sync
  // augmentResourceWithRestMetafields = async (data: ResourceT['codaRow']) => {
  //   if (typeof data.id !== 'number') {
  //     throw new Error('syncMetafields only support ids as numbers');
  //   }
  //   if (!('metafields' in this.resource)) {
  //     throw new Error(METAFIELDS_REQUIRED);
  //   }

  //   const response = await fetchMetafieldsRest(data.id, this.resource, {}, this.fetcher.context);
  //   const updatedData = { ...data } as RowWithMetafields<ResourceT['codaRow']>;

  //   // Only keep metafields that have a definition and in the schema
  //   const metafields = response.body.metafields.filter((m) =>
  //     this.effectiveMetafieldKeys.includes(getMetaFieldFullKey(m))
  //   );
  //   if (metafields.length) {
  //     metafields.forEach((metafield) => {
  //       const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
  //       (updatedData as any)[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
  //     });
  //   }
  //   return updatedData;
  // };
  // augmentSyncWithRestMetafields = async () => {
  //   this.items = await Promise.all(this.items.map(this.augmentResourceWithRestMetafields));
  //   return {
  //     result: this.items,
  //     continuation: this.continuation,
  //   };
  // };

  // augmentSyncWithGraphQlMetafields = async () => {
  //   const { response, continuation } = await this.makeGraphQlMetafieldsRequest();

  //   if (response?.body?.data?.nodes.length) {
  //     const augmentedItems = response.body.data.nodes
  //       .map((node) => {
  //         const resourceMatch = this.items.find((resource) => graphQlGidToId(node.id) === resource.id);

  //         // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
  //         if (!resourceMatch) return;

  //         const updatedresource = { ...resourceMatch } as RowWithMetafields<ResourceT['codaRow']>;
  //         if ('metafields' in node && node.metafields.nodes) {
  //           const metafields = readFragment(MetafieldFieldsFragment, node.metafields.nodes);
  //           metafields.forEach((metafield) => {
  //             const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
  //             (updatedresource as any)[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
  //           });
  //         }
  //         return updatedresource;
  //       })
  //       .filter(Boolean);

  //     return {
  //       result: augmentedItems,
  //       continuation,
  //     };
  //   }

  //   return {
  //     result: this.items,
  //     continuation,
  //   };
  // };
  // #endregion
}
