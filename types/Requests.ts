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
