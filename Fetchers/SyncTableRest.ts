// #region Imports
import * as coda from '@codahq/packs-sdk';

import { GRAPHQL_NODES_LIMIT, REST_DEFAULT_LIMIT } from '../constants';
import { arrayUnique, logAdmin } from '../helpers';
import { extractNextUrlPagination, GetRequestParams, makeGetRequest } from '../helpers-rest';
import {
  calcSyncTableMaxEntriesPerRunNew,
  checkThrottleStatus,
  graphQlGidToId,
  GraphQlResponse,
  idToGraphQlGid,
  makeGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { fetchMetafieldsRest, formatMetaFieldValueForSchema } from '../resources/metafields/metafields-functions';
import {
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../resources/metafields/metafields-helpers';
import { hasMetafieldsInUpdates } from '../resources/metafields/metafields-helpers';
import { fetchMetafieldDefinitionsGraphQl } from '../resources/metafieldDefinitions/metafieldDefinitions-functions';
import { queryNodesMetafieldsByKey, querySingleNodeMetafieldsByKey } from '../resources/metafields/metafields-graphql';
import { ShopifyMaxExceededError } from '../ShopifyErrors';

import type {
  GetNodesMetafieldsByKeyQuery,
  GetNodesMetafieldsByKeyQueryVariables,
} from '../types/generated/admin.generated';
import type { GraphQlResourceName } from '../types/ShopifyGraphQlResourceTypes';
import type { Node, HasMetafields, MetafieldOwnerType } from '../types/generated/admin.types';
import type { SimpleRestNew } from './SimpleRest';
import type { ResourceTypeUnion } from '../types/allResources';
import type { SyncTableTypeUnion } from '../types/SyncTable';
import { ShopifyGraphQlRequestCost } from '../types/Fetcher';

// #endregion

// #region Types
type Stringified<T> = string & {
  [P in keyof T]: { '_ value': T[P] };
};

/** Helper type to extract the parameter values from a SyncTableDef. */
export type SyncTableParamValues<
  T extends coda.SyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>
> = coda.ParamValues<T['getter']['parameters']>;

export type SingleFetchData<T extends SyncTableTypeUnion> = T['rest']['singleFetchResponse'];
export type SingleFetchResponse<T extends SyncTableTypeUnion> = coda.FetchResponse<T['rest']['singleFetchResponse']>;
export type MultipleFetchData<T extends SyncTableTypeUnion> = T['rest']['multipleFetchResponse'];
export type MultipleFetchResponse<T extends SyncTableTypeUnion> = coda.FetchResponse<
  T['rest']['multipleFetchResponse']
>;

export type GetSyncSchema<T extends SyncTableTypeUnion> = T['schema'];
export type GetCodaRow<T extends SyncTableTypeUnion> = T['codaRow'];
export type CodaRowWithMetafields<T extends SyncTableTypeUnion> = GetCodaRow<T> & { [key: string]: any };

export type GetSyncParams<T extends SyncTableTypeUnion> = T['rest']['params']['sync'];
export type GetUpdateParams<T extends SyncTableTypeUnion> = T['rest']['params']['update'];
export type GetCreateParams<T extends SyncTableTypeUnion> = T['rest']['params']['create'];

interface SyncLolRest extends coda.Continuation {
  nextUrl?: string;
  scheduledNextRestUrl?: string;
  skipNextRestSync: string;
  extraContinuationData: {
    [key: string]: any;
  };
}

type currentBatchType<CodaRowT = any> = {
  processing: CodaRowT[];
  remaining: CodaRowT[];
};
interface SyncTableMixedNewContinuationNew<CodaRowT = any> extends SyncLolRest {
  retries: number;
  cursor?: string;
  graphQlLock: string;

  lastCost?: Stringified<ShopifyGraphQlRequestCost>;
  lastMaxEntriesPerRun?: number;
  reducedMaxEntriesPerRun?: number;

  // TODO: currentBatch on le met pas dans extraContinuationData
  extraContinuationData: {
    currentBatch: currentBatchType<CodaRowT>;
    [key: string]: any;
  };
}

// #endregion

// #region Helpers
function stringifyContinuationProperty<T>(
  value: T,
  replacer?: (key: string, value: any) => any,
  space?: string | number
): string & Stringified<T> {
  return JSON.stringify(value, replacer, space) as string & Stringified<T>;
}

function parseContinuationProperty<T>(text: Stringified<T>, reviver?: (key: any, value: any) => any): T {
  return JSON.parse(text);
}
// #endregion

export abstract class SyncTableRestNew<SyncT extends SyncTableTypeUnion> {
  readonly resource: ResourceTypeUnion;
  readonly fetcher: SimpleRestNew<SyncT>;
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

  restLimit: number;
  /** An object of Rest Admin API parameters */
  syncParams: GetSyncParams<SyncT> = {} as GetSyncParams<SyncT>;
  /** The url to call the API with for the sync */
  syncUrl: string;

  /** Formatted items result */
  items: Array<GetCodaRow<SyncT>> = [];
  /** The continuation from the previous sync */
  prevContinuation: SyncTableMixedNewContinuationNew<GetCodaRow<SyncT>>;
  /** The continuation from the current sync */
  continuation: SyncLolRest;
  extraContinuationData: any = {};

  constructor(
    resource: ResourceTypeUnion,
    fetcher: SimpleRestNew<SyncT>,
    codaParams: coda.ParamValues<coda.ParamDefs>
  ) {
    this.resource = resource;
    this.fetcher = fetcher;
    this.codaParams = codaParams;
    this.useGraphQlForMetafields = 'useGraphQlForMetafields' in resource ? resource.useGraphQlForMetafields : undefined;
    this.metafieldOwnerType = 'metafieldOwnerType' in resource ? resource.metafieldOwnerType : undefined;
    if ('graphQl' in resource) {
      this.graphQlResourceName = resource.graphQl.name;
    }
  }

  // #region Sync:Before
  beforeSync() {
    this.setSyncParams();
    this.setSyncUrl();
  }

  abstract setSyncParams(): void;
  validateSyncParams = (params: GetSyncParams<SyncT>): Boolean => true;

  setSyncUrl() {
    this.syncUrl = this.prevContinuation?.nextUrl
      ? coda.withQueryParams(this.prevContinuation.nextUrl, { limit: this.syncParams.limit })
      : this.fetcher.getFetchAllUrl(this.syncParams);
  }
  // #endregion

  // #region Sync
  async makeSyncRequest(params: GetRequestParams): Promise<MultipleFetchResponse<SyncT>> {
    logAdmin(`🚀  Rest Admin API: Starting ${this.resource.display} sync…`);
    return makeGetRequest<SyncT['rest']['multipleFetchResponse']>({ url: params.url }, this.fetcher.context);
  }

  private handleShopifyMaxExceededError(error: ShopifyMaxExceededError, currentBatch: currentBatchType) {
    const maxCostError = error.originalError;
    const { maxCost, cost } = maxCostError.extensions;
    const diminishingFactor = 0.75;
    const reducedMaxEntriesPerRun = Math.min(
      GRAPHQL_NODES_LIMIT,
      Math.max(1, Math.floor((maxCost / cost) * this.restLimit * diminishingFactor))
    );

    const errorContinuation: SyncTableMixedNewContinuationNew = {
      ...this.prevContinuation,
      graphQlLock: 'true',
      retries: (this.prevContinuation?.retries ?? 0) + 1,
      skipNextRestSync: 'true',
      extraContinuationData: {
        ...this.extraContinuationData,
        currentBatch,
      },
      scheduledNextRestUrl: this.prevContinuation?.scheduledNextRestUrl ?? this.continuation?.nextUrl,
      reducedMaxEntriesPerRun: reducedMaxEntriesPerRun,
    };

    console.log(
      `🎚️ ${error.message} Adjusting next query to run with ${errorContinuation.reducedMaxEntriesPerRun} max entries.`
    );

    return {
      response: undefined,
      continuation: errorContinuation,
    };
  }

  private extractCurrentBatch(): currentBatchType<GetCodaRow<SyncT>> {
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
    response: coda.FetchResponse<GraphQlResponse<GetNodesMetafieldsByKeyQuery>>,
    retries: number,
    currentBatch: currentBatchType
  ) {
    let continuation: SyncTableMixedNewContinuationNew | null = null;
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
    return idToGraphQlGid(this.graphQlResourceName, id);
  }

  private async makeGraphQlMetafieldsRequest(): Promise<{
    response: coda.FetchResponse<GraphQlResponse<GetNodesMetafieldsByKeyQuery>>;
    continuation: SyncTableMixedNewContinuationNew | null;
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
      query: queryNodesMetafieldsByKey,
      variables: {
        metafieldKeys: this.effectiveMetafieldKeys,
        countMetafields: this.effectiveMetafieldKeys.length,
        ids: arrayUnique(currentBatch.processing.map((c) => c.id))
          .sort()
          .map((id) => this.convertRestIdToGid(id)),
      } as GetNodesMetafieldsByKeyQueryVariables,
    };

    try {
      let { response, retries } = await makeGraphQlRequest<GetNodesMetafieldsByKeyQuery>(
        { payload, retries: this.prevContinuation?.retries ?? 0 },
        this.fetcher.context
      );
      const continuation = this.buildGraphQlMetafieldsContinuation(response, retries, currentBatch);
      return {
        response,
        continuation,
      };
    } catch (error) {
      if (error instanceof ShopifyMaxExceededError) {
        return this.handleShopifyMaxExceededError(error, currentBatch);
      } else {
        throw error;
      }
    }
  }

  private async getGraphQlMaxEntriesAndDeferWait(defaultMaxEntriesPerRun: number) {
    const previousLockAcquired = this.prevContinuation?.graphQlLock
      ? this.prevContinuation.graphQlLock === 'true'
      : false;
    const throttleStatus = await checkThrottleStatus(this.fetcher.context);
    const { currentlyAvailable, maximumAvailable } = throttleStatus;

    let maxEntriesPerRun: number;
    let shouldDeferBy = 0;

    if (previousLockAcquired) {
      if (this.prevContinuation?.reducedMaxEntriesPerRun) {
        maxEntriesPerRun = this.prevContinuation.reducedMaxEntriesPerRun;
      } else if (this.prevContinuation?.lastCost && this.prevContinuation?.lastMaxEntriesPerRun !== undefined) {
        const previousCost = parseContinuationProperty(this.prevContinuation.lastCost);
        maxEntriesPerRun = calcSyncTableMaxEntriesPerRunNew(
          previousCost,
          this.prevContinuation.lastMaxEntriesPerRun,
          throttleStatus
        );
      } else {
        maxEntriesPerRun = defaultMaxEntriesPerRun;
      }
    } else {
      const minPointsNeeded = maximumAvailable - 1;
      shouldDeferBy = currentlyAvailable < minPointsNeeded ? 3000 : 0;
      maxEntriesPerRun = defaultMaxEntriesPerRun;

      if (shouldDeferBy > 0) {
        logAdmin(
          `🚫 Not enough points (${currentlyAvailable}/${minPointsNeeded}). Skip and wait ${shouldDeferBy / 1000}s`
        );
      }
    }

    return {
      maxEntriesPerRun,
      shouldDeferBy,
    };
  }

  executeSync = async (schema: any) => {
    const { context } = this.fetcher;
    this.prevContinuation = context.sync.continuation as SyncTableMixedNewContinuationNew;
    this.continuation = null;

    this.effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
    const separatedKeys = separatePrefixedMetafieldsKeysFromKeys(this.effectivePropertyKeys);
    this.effectiveStandardFromKeys = separatedKeys.standardFromKeys;
    this.effectiveMetafieldKeys = separatedKeys.prefixedMetafieldFromKeys.map(removePrefixFromMetaFieldKey);
    this.shouldSyncMetafields = !!this.effectiveMetafieldKeys.length;

    // let maxEntriesPerRun = Math.min(REST_DEFAULT_LIMIT, GRAPHQL_NODES_LIMIT);
    this.restLimit = REST_DEFAULT_LIMIT;

    if (this.shouldSyncMetafields) {
      if (this.useGraphQlForMetafields) {
        const syncTableMaxEntriesAndDeferWait = await this.getGraphQlMaxEntriesAndDeferWait(GRAPHQL_NODES_LIMIT);
        const { shouldDeferBy } = syncTableMaxEntriesAndDeferWait;
        if (shouldDeferBy > 0) {
          // TODO: fix `any` type
          return skipGraphQlSyncTableRun(this.prevContinuation as any, shouldDeferBy);
        }
        this.restLimit = syncTableMaxEntriesAndDeferWait.maxEntriesPerRun;
      } else {
        this.restLimit = 30;
      }
    }

    const skipNextRestSync = this.prevContinuation?.skipNextRestSync === 'true';
    // Rest Admin API Sync
    if (!skipNextRestSync) {
      this.beforeSync();
      this.validateSyncParams(this.syncParams);

      const response = await this.makeSyncRequest({ url: this.syncUrl });
      const afterSync = this.afterSync(response);
      this.items = afterSync.restItems;
      this.continuation = afterSync.continuation;

      if (!this.shouldSyncMetafields) {
        return {
          result: this.items,
          continuation: this.continuation,
        };
      }
    }

    if (this.shouldSyncMetafields) {
      return this.useGraphQlForMetafields
        ? this.augmentSyncWithGraphQlMetafields()
        : this.augmentSyncWithRestMetafields();
    }

    return {
      result: [],
    };
  };

  executeUpdate = async (updates: Array<coda.SyncUpdate<string, string, SyncT['schema']>>) => {
    const metafieldDefinitions =
      !!this.metafieldOwnerType && hasMetafieldsInUpdates(updates)
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: this.metafieldOwnerType }, this.fetcher.context)
        : [];

    const completed = await Promise.allSettled(
      updates.map(async (update) => this.fetcher.handleUpdateJob(update, metafieldDefinitions))
    );
    return {
      result: completed.map((job) => {
        if (job.status === 'fulfilled') return job.value;
        else return job.reason;
      }),
    };
  };
  // #endregion

  // #region Sync:After
  handleSyncTableResponse = (response: MultipleFetchResponse<SyncT>): GetCodaRow<SyncT>[] => {
    const { formatApiToRow } = this.fetcher;
    const { plural, singular } = this.resource.rest;
    const resourceKey = this.fetcher.isSingleFetch ? singular : plural;
    const data = response?.body[resourceKey];
    if (data) {
      return Array.isArray(data) ? data.map(formatApiToRow) : [formatApiToRow(data)];
    }
    return [] as GetCodaRow<SyncT>[];
  };

  // afterSync(response: coda.FetchResponse<FetchMulT>) {
  afterSync(response: MultipleFetchResponse<SyncT>) {
    this.items = this.handleSyncTableResponse(response as any);
    let continuation: SyncLolRest | null = null;
    // Check if we have paginated results
    const nextUrl = extractNextUrlPagination(response);
    if (nextUrl) {
      continuation = {
        nextUrl,
        skipNextRestSync: 'false',
        extraContinuationData: this.extraContinuationData,
      };
    }

    return { restItems: this.items, continuation };
  }
  // #endregion

  // #region Augmented Metafields Sync
  augmentResourceWithRestMetafields = async (data: GetCodaRow<SyncT>) => {
    if (typeof data.id !== 'number') {
      throw new Error('syncMetafields only support ids as numbers');
    }
    const response = await fetchMetafieldsRest(data.id, this.resource, {}, this.fetcher.context);
    const updatedData = { ...data } as CodaRowWithMetafields<SyncT>;

    // Only keep metafields that have a definition and in the schema
    const metafields = response.body.metafields.filter((m) =>
      this.effectiveMetafieldKeys.includes(getMetaFieldFullKey(m))
    );
    if (metafields.length) {
      metafields.forEach((metafield) => {
        const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
        (updatedData as any)[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
      });
    }
    return updatedData;
  };
  augmentSyncWithRestMetafields = async () => {
    this.items = await Promise.all(this.items.map(this.augmentResourceWithRestMetafields));
    return {
      result: this.items,
      continuation: this.continuation,
    };
  };

  augmentSyncWithGraphQlMetafields = async () => {
    const { response, continuation } = await this.makeGraphQlMetafieldsRequest();

    if (response?.body?.data?.nodes.length) {
      const augmentedItems = (response.body.data.nodes as unknown as Array<Node & HasMetafields>)
        .map((node) => {
          const resourceMatch = this.items.find((resource) => graphQlGidToId(node.id) === resource.id);

          // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
          if (!resourceMatch) return;

          const updatedresource = { ...resourceMatch } as CodaRowWithMetafields<SyncT>;
          if (node.metafields?.nodes?.length) {
            node.metafields.nodes.forEach((metafield) => {
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
  };
  // #endregion
}
