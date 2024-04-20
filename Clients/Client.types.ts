export interface FetchRequestOptions {
  /**
   * A time in seconds that Coda should cache the result of this HTTP request.
   *
   * Rest Get Requests all use a default value of CACHE_DEFAULT, however, it
   * must be explicitly set for GraphQL queries (not mutations !) (forceCache
   * will then be set to true as it is a POST request).
   */
  cacheTtlSecs?: number;
}

type SearchParamField = string | number;
type SearchParamFields = SearchParamField | SearchParamField[] | Record<string, SearchParamField | SearchParamField[]>;
export type SearchParams = Record<string, SearchParamFields>;
