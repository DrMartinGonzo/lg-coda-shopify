export interface FetchRequestOptions {
  /**
   * Force optional url to connect to. Useful when we want to use a nextUrl from a previous request.
   */
  url?: string;
  /**
   * A time in seconds that Coda should cache the result of this HTTP request.
   *
   * Rest Get Requests all use a default value of CACHE_DEFAULT, however, it
   * must be explicitly set for GraphQL queries (not mutations !) and forceCache
   * will be auto set to true. Cache is always disabled when in a sync table context, unless forceSyncContextCache is set
   */
  cacheTtlSecs?: number;
  /** setting this will force Fetcher to apply the provided cacheTtlSecs value, regardless if we're in a synctable or not */
  forceSyncContextCache?: boolean;
}

export type ShopifyGraphQlThrottleStatus = {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
};

export type ShopifyGraphQlRequestCost = {
  requestedQueryCost: number;
  actualQueryCost: number | null;
  throttleStatus: ShopifyGraphQlThrottleStatus;
};

export type ShopifyGraphQlError = {
  locations: {
    line: number;
    column: number;
  }[];
  message: string;
  path?: string[];
  extensions?: {
    code: string;
    typeName: string;
    fieldName: string;
    cost?: number;
    maxCost?: number;
    documentation?: string;
  };
};

/** Represents an error in the input of a mutation. */
export type ShopifyGraphQlUserError = {
  __typename?: 'UserError';
  /** The path to the input field that caused the error. */
  field: string[];
  code?: string;
  /** The error message. */
  message: string;
};
