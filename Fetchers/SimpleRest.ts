import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../utils/graphql';

import { GRAPHQL_REQUIRED_FOR_METAFIELDS, METAFIELDS_REQUIRED } from '../constants';
import { idToGraphQlGid } from '../helpers-graphql';
import {
  cleanQueryParams,
  getRestBaseUrl,
  makeDeleteRequest,
  makeGetRequest,
  makePostRequest,
  makePutRequest,
} from '../helpers-rest';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import {
  ResourceCreateRestParams,
  ResourceSyncRestParams,
  ResourceUnion,
  ResourceUpdateRestParams,
} from '../resources/Resource.types';
import { MetafieldDefinitionFragment } from '../resources/metafieldDefinitions/metafieldDefinitions-graphql';
import {
  getMetafieldKeyValueSetsFromUpdate,
  updateAndFormatResourceMetafieldsGraphQl,
  updateAndFormatResourceMetafieldsRest,
} from '../resources/metafields/metafields-functions';
import { separatePrefixedMetafieldsKeysFromKeys } from '../resources/metafields/metafields-helpers';
import { getObjectSchemaEffectiveKey } from '../utils/helpers';
import { FetchRequestOptions } from './Fetcher.types';
import { MultipleFetchData, SingleFetchData } from './SyncTableRest';

export abstract class SimpleRest<ResourceT extends ResourceUnion> {
  readonly resource: ResourceT;
  readonly context: coda.ExecutionContext;
  readonly singular: ResourceT['rest']['singular'];
  readonly plural: ResourceT['rest']['plural'];
  readonly baseUrl: string;
  readonly schema: ResourceT['schema'];
  /** Wether this Resource always retrieve just a single result. e.g. Shop */
  readonly isSingleFetch: Boolean;
  metafieldsStrategy: 'legacy' | 'new';

  constructor(resource: ResourceT, context: coda.ExecutionContext, isSingleFetch = false) {
    this.context = context;
    this.resource = resource;
    this.singular = resource.rest.singular;
    this.plural = resource.rest.plural;
    this.baseUrl = getRestBaseUrl(context);
    this.schema = resource.schema;
    this.isSingleFetch = isSingleFetch;
  }

  // #region Urls
  getResourcesUrl = () => {
    // Edge case (e.g. Shop)
    if (this.isSingleFetch) {
      return coda.joinUrl(this.baseUrl, `${this.singular}.json`);
    }
    return coda.joinUrl(this.baseUrl, `${this.plural}.json`);
  };

  getSingleResourceUrl = (id?: number) => {
    // Edge case (e.g. Shop)
    if (this.isSingleFetch) {
      return coda.joinUrl(this.baseUrl, `${this.singular}.json`);
    }
    return coda.joinUrl(this.baseUrl, `${this.plural}/${id}.json`);
  };

  getFetchUrl = (id?: number): string => this.getSingleResourceUrl(id);
  getFetchAllUrl = (params?: ResourceT['rest']['params']['sync']): string =>
    coda.withQueryParams(this.getResourcesUrl(), params ? cleanQueryParams(params) : {});
  getCreateUrl = (): string => this.getResourcesUrl();
  getUpdateUrl = (id: number): string => this.getSingleResourceUrl(id);
  getDeleteUrl = (id: number): string => this.getSingleResourceUrl(id);
  // #endregion

  // #region Validation
  validateParams = (params: ResourceSyncRestParams | ResourceCreateRestParams | ResourceUpdateRestParams): Boolean =>
    true;
  // #endregion

  // #region Formatting
  formatRowToApi = (row: any, metafieldKeyValueSets: any[] = []) => ({});

  abstract formatApiToRow(restData: any): ResourceT['codaRow'];

  // #endregion

  // #region Requests
  fetchAll = (params: ResourceT['rest']['params']['sync'], requestOptions: FetchRequestOptions = {}) => {
    let url = requestOptions.url ?? this.getFetchAllUrl(params);
    return makeGetRequest<MultipleFetchData<ResourceT>>({ ...requestOptions, url }, this.context);
  };

  // l'id est optionnelle pour certains edge cases, comme Shop
  fetch = (id?: number, requestOptions: FetchRequestOptions = {}) => {
    const url = this.getFetchUrl(id);
    return makeGetRequest<SingleFetchData<ResourceT>>({ ...requestOptions, url }, this.context);
  };

  create = (params: ResourceT['rest']['params']['create'], requestOptions: FetchRequestOptions = {}) => {
    this.validateParams(params);
    const payload = { [this.singular]: cleanQueryParams(params) };
    const url = this.getCreateUrl();
    return makePostRequest<SingleFetchData<ResourceT>>({ ...requestOptions, url, payload }, this.context);
  };

  update = async (
    id: number,
    params: ResourceT['rest']['params']['update'],
    requestOptions: FetchRequestOptions = {}
  ) => {
    const restParams = cleanQueryParams(params);

    if (Object.keys(restParams).length) {
      this.validateParams(params);
      const payload = { [this.singular]: restParams };
      const url = this.getUpdateUrl(id);
      return makePutRequest<SingleFetchData<ResourceT>>({ ...requestOptions, url, payload }, this.context);
    }
  };

  delete = async (id: number, requestOptions: FetchRequestOptions = {}) => {
    const url = this.getDeleteUrl(id);
    return makeDeleteRequest({ ...requestOptions, url }, this.context);
  };

  validateUpdateJob(update: coda.SyncUpdate<any, any, ResourceT['schema']>) {
    return true;
  }

  handleUpdateJob = async (
    update: coda.SyncUpdate<string, string, ResourceT['schema']>,
    metafieldDefinitions: ResultOf<typeof MetafieldDefinitionFragment>[] = []
  ) => {
    this.validateUpdateJob(update);

    const originalRow = update.previousValue as ResourceT['codaRow'];
    const includedProperties = update.updatedFields.concat([
      getObjectSchemaEffectiveKey(this.schema, this.schema.idProperty),
    ]);
    const updatedRow = Object.fromEntries(
      Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
    ) as ResourceT['codaRow'];

    const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(Object.keys(updatedRow));
    const metafieldKeyValueSets =
      metafieldDefinitions.length && prefixedMetafieldFromKeys.length
        ? await getMetafieldKeyValueSetsFromUpdate(
            prefixedMetafieldFromKeys,
            updatedRow,
            metafieldDefinitions,
            this.context
          )
        : [];

    return this.updateWithMetafields({ original: originalRow, updated: updatedRow }, metafieldKeyValueSets);
  };

  /**
   * Update une ressource sur Shopify depuis Coda.
   * Pas la même stratégie que d'habitude pour cette fonction.
   * On ne peut pas directement update les metafields pour les articles.
   * Il va falloir faire un appel séparé pour chaque metafield
   */
  updateWithMetafields = async (
    row: { original?: ResourceT['codaRow']; updated: ResourceT['codaRow'] },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<ResourceT['codaRow']> => {
    const originalRow = row.original ?? {};
    const updatedRow = row.updated;
    const rowId = updatedRow.id;
    if (typeof rowId !== 'number') {
      throw new Error('handleUpdateJob only support ids as numbers');
    }
    if (!('metafields' in this.resource)) {
      throw new Error(METAFIELDS_REQUIRED);
    }

    const restParams = this.formatRowToApi(updatedRow) as ResourceT['rest']['params']['update'];
    const updateResourcePromise = restParams ? this.update(rowId, restParams) : undefined;

    const updateMetafieldsPromise = metafieldKeyValueSets.length
      ? updateAndFormatResourceMetafieldsRest(
          { ownerId: rowId, ownerResource: this.resource, metafieldKeyValueSets },
          this.context
        )
      : undefined;

    const [res, formattedMetafields] = await Promise.all([updateResourcePromise, updateMetafieldsPromise]);

    const updatedResource = res?.body[this.singular] ? this.formatApiToRow(res.body[this.singular]) : {};
    return {
      ...originalRow,
      id: rowId,
      ...updatedResource,
      ...(formattedMetafields ?? {}),
    } as ResourceT['codaRow'];
  };

  _updateWithMetafieldsGraphQl = async (
    row: {
      original?: ResourceT['codaRow'];
      updated: ResourceT['codaRow'];
    },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<ResourceT['codaRow']> => {
    if (!('metafields' in this.resource)) {
      throw new Error(METAFIELDS_REQUIRED);
    }
    if (!this.resource.metafields.useGraphQl) {
      throw new Error(GRAPHQL_REQUIRED_FOR_METAFIELDS);
    }

    const originalRow = row.original ?? {};
    const updatedRow = row.updated;
    const rowId = updatedRow.id;
    if (typeof rowId !== 'number') {
      throw new Error('handleUpdateJob only support ids as numbers');
    }

    const restParams = this.formatRowToApi(updatedRow) as ResourceT['rest']['params']['update'];
    const updateResourcePromise = restParams ? this.update(rowId, restParams) : undefined;

    const updateMetafieldsPromise = metafieldKeyValueSets.length
      ? updateAndFormatResourceMetafieldsGraphQl(
          {
            ownerGid: idToGraphQlGid(this.resource.graphQl.name, rowId),
            metafieldKeyValueSets,
          },
          this.context
        )
      : undefined;

    const [res, formattedMetafields] = await Promise.all([updateResourcePromise, updateMetafieldsPromise]);

    const updatedResource = res?.body[this.singular] ? this.formatApiToRow(res.body[this.singular]) : {};
    return {
      ...originalRow,
      id: rowId,
      ...updatedResource,
      ...(formattedMetafields ?? {}),
    } as ResourceT['codaRow'];
  };
  // #endregion
}
