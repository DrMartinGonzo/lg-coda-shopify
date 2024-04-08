import * as coda from '@codahq/packs-sdk';

import {
  cleanQueryParams,
  getRestBaseUrl,
  makeDeleteRequest,
  makeGetRequest,
  makePostRequest,
  makePutRequest,
} from '../../../helpers-rest';
import {
  ResourceCreateRestParams,
  ResourceSyncRestParams,
  ResourceUnion,
  ResourceUpdateRestParams,
} from '../../../resources/Resource.types';
import { FetchRequestOptions, IClient } from '../../Fetcher.types';

// #region Types
// Helper types for easier access
export type SingleFetchRestData<T extends ResourceUnion> = T['rest']['singleFetchResponse'];
type SingleFetchRestResponse<T extends ResourceUnion> = coda.FetchResponse<T['rest']['singleFetchResponse']>;
export type MultipleFetchRestData<T extends ResourceUnion> = T['rest']['multipleFetchResponse'];
export type MultipleFetchRestResponse<T extends ResourceUnion> = coda.FetchResponse<T['rest']['multipleFetchResponse']>;
// #endregion

export abstract class RestClient<ResourceT extends ResourceUnion> implements IClient {
  readonly resource: ResourceT;
  readonly context: coda.ExecutionContext;

  readonly singular: ResourceT['rest']['singular'];
  readonly plural: ResourceT['rest']['plural'];
  readonly baseUrl: string;
  /** Wether this Resource always retrieve just a single result. e.g. Shop */
  readonly isSingleFetch: Boolean;

  constructor(resource: ResourceT, context: coda.ExecutionContext, isSingleFetch = false) {
    this.resource = resource;
    this.context = context;

    this.singular = resource.rest.singular;
    this.plural = resource.rest.plural;
    this.baseUrl = getRestBaseUrl(context);
    /** For edge cases like Shop */
    this.isSingleFetch = isSingleFetch;
  }

  // #region Urls
  getResourcesUrl() {
    // Edge case (e.g. Shop)
    if (this.isSingleFetch) {
      return coda.joinUrl(this.baseUrl, `${this.singular}.json`);
    }
    return coda.joinUrl(this.baseUrl, `${this.plural}.json`);
  }

  getSingleResourceUrl(id?: number) {
    // Edge case (e.g. Shop)
    if (this.isSingleFetch) {
      return coda.joinUrl(this.baseUrl, `${this.singular}.json`);
    }
    return coda.joinUrl(this.baseUrl, `${this.plural}/${id}.json`);
  }

  getFetchUrl(id?: number): string {
    return this.getSingleResourceUrl(id);
  }
  getFetchAllUrl(params?: ResourceT['rest']['params']['sync']): string {
    return coda.withQueryParams(this.getResourcesUrl(), params ? cleanQueryParams(params) : {});
  }
  getCreateUrl(): string {
    return this.getResourcesUrl();
  }
  protected getUpdateUrl(id: number): string {
    return this.getSingleResourceUrl(id);
  }
  getDeleteUrl(id: number): string {
    return this.getSingleResourceUrl(id);
  }
  // #endregion

  // #region Validation
  validateParams(params: ResourceSyncRestParams | ResourceCreateRestParams | ResourceUpdateRestParams): Boolean {
    return true;
  }
  // #endregion

  // #region Requests
  fetchAll(params: ResourceT['rest']['params']['sync'], requestOptions: FetchRequestOptions = {}) {
    let url = requestOptions.url ?? this.getFetchAllUrl(params);
    return makeGetRequest<MultipleFetchRestData<ResourceT>>({ ...requestOptions, url }, this.context);
  }

  // l'id est optionnelle pour certains edge cases, comme Shop
  fetch(id?: number, requestOptions: FetchRequestOptions = {}) {
    const url = this.getFetchUrl(id);
    return makeGetRequest<SingleFetchRestData<ResourceT>>({ ...requestOptions, url }, this.context);
  }

  create(params: ResourceT['rest']['params']['create'], requestOptions: FetchRequestOptions = {}) {
    this.validateParams(params);
    const payload = { [this.singular]: cleanQueryParams(params) };
    const url = this.getCreateUrl();
    return makePostRequest<SingleFetchRestData<ResourceT>>({ ...requestOptions, url, payload }, this.context);
  }

  async update(id: number, params: ResourceT['rest']['params']['update'], requestOptions: FetchRequestOptions = {}) {
    const restParams = cleanQueryParams(params);

    if (Object.keys(restParams).length) {
      this.validateParams(params);
      const payload = { [this.singular]: restParams };
      const url = this.getUpdateUrl(id);
      return makePutRequest<SingleFetchRestData<ResourceT>>({ ...requestOptions, url, payload }, this.context);
    }
  }

  async delete(id: number, requestOptions: FetchRequestOptions = {}) {
    const url = this.getDeleteUrl(id);
    try {
      const response = makeDeleteRequest({ ...requestOptions, url }, this.context);
      return response;
    } catch (error) {
      // If the request failed because the server returned a 300+ status code.
      if (coda.StatusCodeError.isStatusCodeError(error)) {
        const statusError = error as coda.StatusCodeError;
        if (statusError.statusCode === 404) {
          console.error(`${this.resource.display} with ID ${id} not found. Possibly already deleted.`);
        }
      }
      // The request failed for some other reason. Re-throw the error so that it bubbles up.
      throw error;
    }
  }
  // #endregion
}
