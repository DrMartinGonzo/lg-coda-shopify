import * as coda from '@codahq/packs-sdk';

import { getObjectSchemaEffectiveKey } from '../helpers';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import {
  cleanQueryParams,
  getRestBaseUrl,
  makeDeleteRequest,
  makeGetRequest,
  makePostRequest,
  makePutRequest,
} from '../helpers-rest';
import { getGraphQlResourceFromMetafieldOwnerType, idToGraphQlGid } from '../helpers-graphql';
import {
  getMetafieldKeyValueSetsFromUpdate,
  separatePrefixedMetafieldsKeysFromKeys,
  updateAndFormatResourceMetafieldsGraphQl,
  updateAndFormatResourceMetafieldsRest,
} from '../metafields/metafields-functions';

import type { FetchRequestOptions } from '../types/Requests';
import type { MetafieldDefinitionFragment } from '../types/admin.generated';
import type {
  GetCodaRow,
  GetCreateParams,
  GetSyncParams,
  GetSyncSchema,
  GetUpdateParams,
  MultipleFetchData,
  SingleFetchData,
} from './SyncTableRest';
import type {
  RestCreateParamsUnion,
  RestSyncParamsUnion,
  RestUpdateParamsUnion,
  SyncTableTypeUnion,
} from '../types/SyncTable';
import type { ResourceTypeUnion } from '../typesNew/allResources';

export abstract class SimpleRestNew<SyncT extends SyncTableTypeUnion> {
  readonly resource: ResourceTypeUnion;
  readonly context: coda.ExecutionContext;
  readonly singular: string;
  readonly plural: string;
  readonly baseUrl: string;
  readonly schema: GetSyncSchema<SyncT>;
  /** Wether this Resource always retrieve just a single result. e.g. Shop */
  readonly isSingleFetch: Boolean;
  metafieldsStrategy: 'legacy' | 'new';

  constructor(resource: ResourceTypeUnion, context: coda.ExecutionContext, isSingleFetch = false) {
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
  getFetchAllUrl = (params?: GetSyncParams<SyncT>): string =>
    coda.withQueryParams(this.getResourcesUrl(), params ? cleanQueryParams(params) : {});
  getCreateUrl = (): string => this.getResourcesUrl();
  getUpdateUrl = (id: number): string => this.getSingleResourceUrl(id);
  getDeleteUrl = (id: number): string => this.getSingleResourceUrl(id);
  // #endregion

  // #region Validation
  validateParams = (params: RestSyncParamsUnion | RestCreateParamsUnion | RestUpdateParamsUnion): Boolean => true;
  // #endregion

  // #region Formatting
  formatRowToApi = (row: any, metafieldKeyValueSets: any[] = []) => ({});

  abstract formatApiToRow(restData: any): GetCodaRow<SyncT>;

  // #endregion

  // #region Requests
  fetchAll = (params: GetSyncParams<SyncT>, requestOptions: FetchRequestOptions = {}) => {
    let url = requestOptions.url ?? this.getFetchAllUrl(params);
    return makeGetRequest<MultipleFetchData<SyncT>>({ ...requestOptions, url }, this.context);
  };

  // l'id est optionnelle pour certains edge cases, comme Shop
  fetch = (id?: number, requestOptions: FetchRequestOptions = {}) => {
    const url = this.getFetchUrl(id);
    return makeGetRequest<SingleFetchData<SyncT>>({ ...requestOptions, url }, this.context);
  };

  create = (params: GetCreateParams<SyncT>, requestOptions: FetchRequestOptions = {}) => {
    this.validateParams(params);
    const payload = { [this.singular]: cleanQueryParams(params) };
    const url = this.getCreateUrl();
    return makePostRequest<SingleFetchData<SyncT>>({ ...requestOptions, url, payload }, this.context);
  };

  update = async (id: number, params: GetUpdateParams<SyncT>, requestOptions: FetchRequestOptions = {}) => {
    const restParams = cleanQueryParams(params);

    if (Object.keys(restParams).length) {
      this.validateParams(params);
      const payload = { [this.singular]: restParams };
      const url = this.getUpdateUrl(id);
      return makePutRequest<SingleFetchData<SyncT>>({ ...requestOptions, url, payload }, this.context);
    }
  };

  delete = async (id: number, requestOptions: FetchRequestOptions = {}) => {
    const url = this.getDeleteUrl(id);
    return makeDeleteRequest({ ...requestOptions, url }, this.context);
  };

  validateUpdateJob(update: coda.SyncUpdate<any, any, SyncT['schema']>) {
    return true;
  }

  handleUpdateJob = async (
    update: coda.SyncUpdate<string, string, SyncT['schema']>,
    metafieldDefinitions: MetafieldDefinitionFragment[] = []
  ) => {
    this.validateUpdateJob(update);

    const originalRow = update.previousValue as GetCodaRow<SyncT>;
    const includedProperties = update.updatedFields.concat([
      getObjectSchemaEffectiveKey(this.schema, this.schema.idProperty),
    ]);
    const updatedRow = Object.fromEntries(
      Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
    ) as GetCodaRow<SyncT>;

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
    row: { original?: GetCodaRow<SyncT>; updated: GetCodaRow<SyncT> },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<GetCodaRow<SyncT>> => {
    const originalRow = row.original ?? {};
    const updatedRow = row.updated;
    const rowId = updatedRow.id;
    if (typeof rowId !== 'number') {
      throw new Error('handleUpdateJob only support ids as numbers');
    }

    const restParams = this.formatRowToApi(updatedRow) as GetUpdateParams<SyncT>;
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
    } as GetCodaRow<SyncT>;
  };

  _updateWithMetafieldsGraphQl = async (
    row: {
      original?: GetCodaRow<SyncT>;
      updated: GetCodaRow<SyncT>;
    },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<GetCodaRow<SyncT>> => {
    if (!('metafieldOwnerType' in this.resource)) {
      throw new Error('resource must have a metafieldOwnerType to use _updateWithMetafieldsGraphQl');
    }

    const originalRow = row.original ?? {};
    const updatedRow = row.updated;
    const rowId = updatedRow.id;
    if (typeof rowId !== 'number') {
      throw new Error('handleUpdateJob only support ids as numbers');
    }

    const restParams = this.formatRowToApi(updatedRow) as GetUpdateParams<SyncT>;
    const updateResourcePromise = restParams ? this.update(rowId, restParams) : undefined;

    const updateMetafieldsPromise = metafieldKeyValueSets.length
      ? updateAndFormatResourceMetafieldsGraphQl(
          {
            // TODO: fonction pas terrible pour recup le nom du GraphQL bidule
            ownerGid: idToGraphQlGid(getGraphQlResourceFromMetafieldOwnerType(this.resource.metafieldOwnerType), rowId),
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
    } as GetCodaRow<SyncT>;
  };
  // #endregion
}
