// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf, readFragment } from '../utils/graphql';

import { GRAPHQL_NODES_LIMIT, METAFIELDS_REQUIRED, REST_DEFAULT_LIMIT } from '../constants';
import {
  GraphQlResponse,
  calcSyncTableMaxEntriesPerRunNew,
  checkThrottleStatus,
  graphQlGidToId,
  idToGraphQlGid,
  makeGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { GetRequestParams, extractNextUrlPagination, makeGetRequest } from '../helpers-rest';
import { Resource, ResourceWithMetafields, ResourceUnion } from '../resources/Resource.types';
import { fetchMetafieldDefinitionsGraphQl } from '../resources/metafieldDefinitions/metafieldDefinitions-functions';
import { fetchMetafieldsRest, formatMetaFieldValueForSchema } from '../resources/metafields/metafields-functions';
import { metafieldFieldsFragment, getNodesMetafieldsByKeyQuery } from '../resources/metafields/metafields-graphql';
import {
  getMetaFieldFullKey,
  hasMetafieldsInUpdates,
  preprendPrefixToMetaFieldKey,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../resources/metafields/metafields-helpers';
import { BaseRow, RowWithMetafields } from '../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../types/admin.types';
import { arrayUnique, logAdmin } from '../utils/helpers';
import { ShopifyGraphQlRequestCost } from './Fetcher.types';
import { ShopifyMaxExceededError } from './ShopifyErrors';
import { GraphQlResourceName } from './ShopifyGraphQlResource.types';
import { SimpleRest } from './SimpleRest';

// #endregion

// #region Types
/** Helper type to extract the parameter values from a SyncTableDef. */
export type SyncTableParamValues<
  T extends coda.SyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>
> = coda.ParamValues<T['getter']['parameters']>;

// Helper types for easier access
export type SingleFetchData<T extends ResourceUnion> = T['rest']['singleFetchResponse'];
export type MultipleFetchData<T extends ResourceUnion> = T['rest']['multipleFetchResponse'];
export type MultipleFetchResponse<T extends ResourceUnion> = coda.FetchResponse<T['rest']['multipleFetchResponse']>;

export interface SyncTableRestContinuation extends coda.Continuation {
  nextUrl?: string;
  scheduledNextRestUrl?: string;
  skipNextRestSync: string;
  extraContinuationData: {
    [key: string]: any;
  };
}

type currentBatchType<CodaRowT extends BaseRow = any> = {
  processing: CodaRowT[];
  remaining: CodaRowT[];
};
export interface SyncTableMixedContinuation<CodaRowT extends BaseRow = any> extends SyncTableRestContinuation {
  cursor?: string;
  retries: number;
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
export type Stringified<T> = string & {
  [P in keyof T]: { '_ value': T[P] };
};

/**
 * Serializes a value to a JSON string with a special type to ensure that the
 * resulting string can be used to recreate the original value.
 *
 * @param value The value to serialize.
 * @param replacer An optional function used to transform values before they
 * are serialized.
 * @param space An optional string or number used to add indentation,
 * white space, and line breaks to the resulting JSON.
 * @returns A string that contains the JSON representation of the given value
 * with a special type to ensure it can be used to recreate the original value.
 */
export function stringifyContinuationProperty<T>(
  value: T,
  replacer?: (key: string, value: any) => any,
  space?: string | number
): string & Stringified<T> {
  return JSON.stringify(value, replacer, space) as string & Stringified<T>;
}

/**
 * Parses a JSON string with a special type created by
 * `stringifyContinuationProperty` to recreate the original value.
 *
 * @param text The string to parse.
 * @param reviver An optional function used to transform values after they
 * are parsed.
 * @returns The original value recreated from the parsed string.
 */
export function parseContinuationProperty<T>(text: Stringified<T>, reviver?: (key: any, value: any) => any): T {
  return JSON.parse(text);
}
// #endregion

export abstract class SyncTableRest<ResourceT extends ResourceUnion> {
  readonly resource: ResourceT;
  readonly fetcher: SimpleRest<any>;
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
  syncParams: ResourceT['rest']['params']['sync'] = {} as ResourceT['rest']['params']['sync'];
  /** The url to call the API with for the sync */
  syncUrl: string;

  /** Formatted items result */
  items: Array<ResourceT['codaRow']> = [];
  /** The continuation from the previous sync */
  prevContinuation: SyncTableMixedContinuation<ResourceT['codaRow']>;
  /** The continuation from the current sync */
  continuation: SyncTableRestContinuation;
  extraContinuationData: any = {};

  constructor(resource: ResourceT, fetcher: SimpleRest<ResourceT>, codaParams: coda.ParamValues<coda.ParamDefs>) {
    this.resource = resource;
    this.fetcher = fetcher;
    this.codaParams = codaParams;
    this.useGraphQlForMetafields = 'metafields' in resource ? resource.metafields.useGraphQl : undefined;
    this.metafieldOwnerType = 'metafields' in resource ? resource.metafields.ownerType : undefined;
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
  validateSyncParams = (params: ResourceT['rest']['params']['sync']): Boolean => true;

  setSyncUrl() {
    this.syncUrl = this.prevContinuation?.nextUrl
      ? coda.withQueryParams(this.prevContinuation.nextUrl, { limit: this.syncParams.limit })
      : this.fetcher.getFetchAllUrl(this.syncParams);
  }
  // #endregion

  // #region Sync
  async makeSyncRequest(params: GetRequestParams): Promise<MultipleFetchResponse<ResourceT>> {
    logAdmin(`🚀  Rest Admin API: Starting ${this.resource.display} sync…`);
    return makeGetRequest<MultipleFetchData<ResourceT>>({ url: params.url }, this.fetcher.context);
  }

  private handleShopifyMaxExceededError(error: ShopifyMaxExceededError, currentBatch: currentBatchType) {
    const maxCostError = error.originalError;
    const { maxCost, cost } = maxCostError.extensions;
    const diminishingFactor = 0.75;
    const reducedMaxEntriesPerRun = Math.min(
      GRAPHQL_NODES_LIMIT,
      Math.max(1, Math.floor((maxCost / cost) * this.restLimit * diminishingFactor))
    );

    const errorContinuation: SyncTableMixedContinuation = {
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

  private extractCurrentBatch(): currentBatchType<ResourceT['codaRow']> {
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
    response: coda.FetchResponse<GraphQlResponse<ResultOf<typeof getNodesMetafieldsByKeyQuery>>>,
    retries: number,
    currentBatch: currentBatchType
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
    return idToGraphQlGid(this.graphQlResourceName, id);
  }

  private async makeGraphQlMetafieldsRequest(): Promise<{
    response: coda.FetchResponse<GraphQlResponse<ResultOf<typeof getNodesMetafieldsByKeyQuery>>>;
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

    try {
      let { response, retries } = await makeGraphQlRequest<ResultOf<typeof getNodesMetafieldsByKeyQuery>>(
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
    this.prevContinuation = context.sync.continuation as SyncTableMixedContinuation;
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

  executeUpdate = async (updates: Array<coda.SyncUpdate<string, string, ResourceT['schema']>>) => {
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
  handleSyncTableResponse = (response: MultipleFetchResponse<ResourceT>): ResourceT['codaRow'][] => {
    const { formatApiToRow } = this.fetcher;
    const { plural, singular } = this.resource.rest;
    const resourceKey = this.fetcher.isSingleFetch ? singular : plural;
    const data = response?.body[resourceKey];
    if (data) {
      return Array.isArray(data) ? data.map(formatApiToRow) : [formatApiToRow(data)];
    }
    return [] as ResourceT['codaRow'][];
  };

  // afterSync(response: coda.FetchResponse<FetchMulT>) {
  afterSync(response: MultipleFetchResponse<ResourceT>) {
    this.items = this.handleSyncTableResponse(response as any);
    let continuation: SyncTableRestContinuation | null = null;
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
  augmentResourceWithRestMetafields = async (data: ResourceT['codaRow']) => {
    if (typeof data.id !== 'number') {
      throw new Error('syncMetafields only support ids as numbers');
    }
    if (!('metafields' in this.resource)) {
      throw new Error(METAFIELDS_REQUIRED);
    }

    const response = await fetchMetafieldsRest(data.id, this.resource, {}, this.fetcher.context);
    const updatedData = { ...data } as RowWithMetafields<ResourceT['codaRow']>;

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
  };
  // #endregion
}
