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

import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';
import {
  getMetafieldKeyValueSetsFromUpdate,
  hasMetafieldsInUpdates,
  separatePrefixedMetafieldsKeysFromKeys,
  updateAndFormatResourceMetafieldsGraphQl,
  updateAndFormatResourceMetafieldsRest,
} from '../metafields/metafields-functions';

import type { FetchRequestOptions } from '../types/Requests';

import type { Article as ArticleRest } from '@shopify/shopify-api/rest/admin/2023-10/article';
import type { Blog as BlogRest } from '@shopify/shopify-api/rest/admin/2023-10/blog';
import type { Collection as CollectionRest } from '@shopify/shopify-api/rest/admin/2023-10/collection';
import type { CustomCollection as CustomCollectionRest } from '@shopify/shopify-api/rest/admin/2023-10/custom_collection';
import type { Customer as CustomerRest } from '@shopify/shopify-api/rest/admin/2023-10/customer';
import type { DraftOrder as DraftOrderRest } from '@shopify/shopify-api/rest/admin/2023-10/draft_order';
import type { InventoryItem as InventoryItemRest } from '@shopify/shopify-api/rest/admin/2023-10/inventory_item';
import type { InventoryLevel as InventoryLevelRest } from '@shopify/shopify-api/rest/admin/2023-10/inventory_level';
import type { Location as LocationRest } from '@shopify/shopify-api/rest/admin/2023-10/location';
import type { Order as OrderRest } from '@shopify/shopify-api/rest/admin/2023-10/order';
import type { Page as PageRest } from '@shopify/shopify-api/rest/admin/2023-10/page';
import type { Product as ProductRest } from '@shopify/shopify-api/rest/admin/2023-10/product';
import type { SmartCollection as SmartCollectionRest } from '@shopify/shopify-api/rest/admin/2023-10/smart_collection';
import type { Variant as VariantRest } from '@shopify/shopify-api/rest/admin/2023-10/variant';
import type { Shop as ShopRest } from '@shopify/shopify-api/rest/admin/2023-10/shop';
import type * as CodaRows from '../types/CodaRows';

import { restResources } from '../types/RequestsRest';
import type { RestResource, RestResourceName, RestResourcePlural, RestResourceSingular } from '../types/RequestsRest';
import type { MetafieldDefinitionFragment } from '../types/admin.generated';
import type { ArticleCreateRestParams, ArticleSyncTableRestParams, ArticleUpdateRestParams } from '../types/Article';
import type { BlogCreateRestParams, BlogSyncTableRestParams, BlogUpdateRestParams } from '../types/Blog';
import type { CollectSyncTableRestParams } from '../types/Collect';
import type {
  CollectionCreateRestParams,
  CollectionSyncTableRestParams,
  CollectionUpdateRestParams,
} from '../types/Collection';
import type {
  CustomerCreateRestParams,
  CustomerSyncTableRestParams,
  CustomerUpdateRestParams,
} from '../types/Customer';
import type { DraftOrderSyncTableRestParams, DraftOrderUpdateRestParams } from '../types/DraftOrder';
import type { InventoryLevelSyncTableRestParams } from '../types/InventoryLevel';
import type { OrderSyncTableRestParams, OrderUpdateRestParams } from '../types/Order';
import type { PageCreateRestParams, PageUpdateRestParams } from '../types/Page';
import type { ProductCreateRestParams, ProductSyncTableRestParams } from '../types/Product';

type GetRestResource<T extends RestResourceName> = T extends RestResourceName.Article
  ? ArticleRest
  : T extends RestResourceName.Blog
  ? BlogRest
  : T extends RestResourceName.Collection
  ? CollectionRest
  : T extends RestResourceName.CustomCollection
  ? CustomCollectionRest
  : T extends RestResourceName.SmartCollection
  ? SmartCollectionRest
  : T extends RestResourceName.Customer
  ? CustomerRest
  : T extends RestResourceName.DraftOrder
  ? DraftOrderRest
  : T extends RestResourceName.InventoryItem
  ? InventoryItemRest
  : T extends RestResourceName.InventoryLevel
  ? InventoryLevelRest
  : T extends RestResourceName.Location
  ? LocationRest
  : T extends RestResourceName.Order
  ? OrderRest
  : T extends RestResourceName.Page
  ? PageRest
  : T extends RestResourceName.Product
  ? ProductRest
  : T extends RestResourceName.ProductVariant
  ? VariantRest
  : T extends RestResourceName.Shop
  ? ShopRest
  : never;

type GetSyncTableSchema<T extends RestResourceName> = T extends RestResourceName.Article
  ? CodaRows.ArticleRow
  : T extends RestResourceName.Blog
  ? CodaRows.BlogRow
  : T extends RestResourceName.Collect
  ? CodaRows.CollectRow
  : T extends RestResourceName.Collection
  ? CodaRows.CollectionRow
  : T extends RestResourceName.CustomCollection
  ? CodaRows.CollectionRow
  : T extends RestResourceName.SmartCollection
  ? CodaRows.CollectionRow
  : T extends RestResourceName.Customer
  ? CodaRows.CustomerRow
  : T extends RestResourceName.DraftOrder
  ? CodaRows.DraftOrderRow
  : T extends RestResourceName.InventoryItem
  ? CodaRows.InventoryItemRow
  : T extends RestResourceName.InventoryLevel
  ? CodaRows.InventoryLevelRow
  : T extends RestResourceName.Location
  ? CodaRows.LocationRow
  : T extends RestResourceName.Order
  ? CodaRows.OrderRow
  : T extends RestResourceName.Page
  ? CodaRows.PageRow
  : T extends RestResourceName.Product
  ? CodaRows.ProductRow
  : T extends RestResourceName.ProductVariant
  ? CodaRows.ProductVariantRow
  : T extends RestResourceName.Shop
  ? CodaRows.ShopRow
  : never;

export type singleFetchData<T extends RestResourceName> = Record<(typeof RestResourceSingular)[T], GetRestResource<T>>;
type multipleFetchData<T extends RestResourceName> = Record<(typeof RestResourcePlural)[T], Array<GetRestResource<T>>>;

type SyncParams<T extends RestResourceName> = T extends RestResourceName.Article
  ? ArticleSyncTableRestParams
  : T extends RestResourceName.Blog
  ? BlogSyncTableRestParams
  : T extends RestResourceName.Collection | RestResourceName.CustomCollection | RestResourceName.SmartCollection
  ? CollectionSyncTableRestParams
  : T extends RestResourceName.Collect
  ? CollectSyncTableRestParams
  : T extends RestResourceName.Customer
  ? CustomerSyncTableRestParams
  : T extends RestResourceName.DraftOrder
  ? DraftOrderSyncTableRestParams
  : T extends RestResourceName.InventoryLevel
  ? InventoryLevelSyncTableRestParams
  : T extends RestResourceName.Order
  ? OrderSyncTableRestParams
  : T extends RestResourceName.Product
  ? ProductSyncTableRestParams
  : never;

type CreateParams<T extends RestResourceName> = T extends RestResourceName.Article
  ? ArticleCreateRestParams
  : T extends RestResourceName.Blog
  ? BlogCreateRestParams
  : T extends RestResourceName.Collection | RestResourceName.CustomCollection
  ? CollectionCreateRestParams
  : T extends RestResourceName.Customer
  ? CustomerCreateRestParams
  : T extends RestResourceName.Page
  ? PageCreateRestParams
  : T extends RestResourceName.Product
  ? ProductCreateRestParams
  : never;

type UpdateParams<T extends RestResourceName> = T extends RestResourceName.Article
  ? ArticleUpdateRestParams
  : T extends RestResourceName.Blog
  ? BlogUpdateRestParams
  : T extends RestResourceName.Collection | RestResourceName.CustomCollection | RestResourceName.SmartCollection
  ? CollectionUpdateRestParams
  : // : T extends RestResourceName.CustomCollection
  // ? CollectionUpdateRestParams
  // : T extends RestResourceName.SmartCollection
  // ? CollectionUpdateRestParams
  T extends RestResourceName.Customer
  ? CustomerUpdateRestParams
  : T extends RestResourceName.DraftOrder
  ? DraftOrderUpdateRestParams
  : T extends RestResourceName.Order
  ? OrderUpdateRestParams
  : T extends RestResourceName.Page
  ? PageUpdateRestParams
  : never;

export class SimpleRest<T extends RestResourceName, K extends coda.ObjectSchema<string, string>> {
  resource: RestResource;
  resourceName: T;
  context: coda.ExecutionContext;
  singular: string;
  plural: string;
  baseUrl: string;
  metafieldsStrategy: 'legacy' | 'new';
  schema: K;

  constructor(resourceName: T, schema: K, context: coda.ExecutionContext) {
    this.resourceName = resourceName;
    this.resource = restResources[resourceName];
    this.context = context;
    this.singular = this.resource.singular;
    this.plural = this.resource.plural;
    this.baseUrl = getRestBaseUrl(context);
    this.schema = schema;
  }

  // #region Urls
  getResourcesUrl = () => coda.joinUrl(this.baseUrl, `${this.plural}.json`);
  getSpecificResourceUrl = (id: number) => coda.joinUrl(this.baseUrl, `${this.plural}/${id}.json`);

  getFetchUrl = (id: number): string => this.getSpecificResourceUrl(id);
  getFetchAllUrl = (params: SyncParams<T>): string =>
    coda.withQueryParams(this.getResourcesUrl(), cleanQueryParams(params));
  getCreateUrl = (): string => this.getResourcesUrl();
  getUpdateUrl = (id: number): string => this.getSpecificResourceUrl(id);
  getDeleteUrl = (id: number): string => this.getSpecificResourceUrl(id);
  // #endregion

  // #region Validation
  validateParams = (params: any): Boolean => true;
  // #endregion

  // #region Formatting
  formatRowToApi = (row: any, metafieldKeyValueSets: any[] = []) => ({});

  formatApiToRow = (restData: any) => ({});
  // #endregion

  // #region Requests
  fetchAll = (params: SyncParams<T>, requestOptions: FetchRequestOptions = {}) => {
    let url = requestOptions.url ?? this.getFetchAllUrl(params);
    return makeGetRequest<multipleFetchData<T>>({ ...requestOptions, url }, this.context);
  };

  fetch = (id: number, requestOptions: FetchRequestOptions = {}) => {
    const url = this.getFetchUrl(id);
    return makeGetRequest<singleFetchData<T>>({ ...requestOptions, url }, this.context);
  };

  create = (params: CreateParams<T>, requestOptions: FetchRequestOptions = {}) => {
    this.validateParams(params);
    const payload = { [this.singular]: cleanQueryParams(params) };
    const url = this.getCreateUrl();
    return makePostRequest<singleFetchData<T>>({ ...requestOptions, url, payload }, this.context);
  };

  update = async (id: number, params: UpdateParams<T>, requestOptions: FetchRequestOptions = {}) => {
    const restParams = cleanQueryParams(params);

    if (Object.keys(restParams).length) {
      this.validateParams(params);
      const payload = { [this.singular]: restParams };
      const url = this.getUpdateUrl(id);
      return makePutRequest<singleFetchData<T>>({ ...requestOptions, url, payload }, this.context);
    }
  };

  delete = async (id: number, requestOptions: FetchRequestOptions = {}) => {
    const url = this.getDeleteUrl(id);
    return makeDeleteRequest({ ...requestOptions, url }, this.context);
  };

  executeSyncTableUpdate = async (updates: Array<coda.SyncUpdate<any, any, K>>) => {
    const metafieldDefinitions =
      !!this.resource.metafieldOwnerType && hasMetafieldsInUpdates(updates)
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: this.resource.metafieldOwnerType }, this.context)
        : [];

    const completed = await Promise.allSettled(
      updates.map(async (update) => this.handleUpdateJob(update, metafieldDefinitions))
    );
    return {
      result: completed.map((job) => {
        if (job.status === 'fulfilled') return job.value;
        else return job.reason;
      }),
    };
  };

  handleUpdateJob = async (
    update: coda.SyncUpdate<any, any, K>,
    metafieldDefinitions: MetafieldDefinitionFragment[] = []
  ) => {
    const originalRow = update.previousValue as GetSyncTableSchema<T>;
    const includedProperties = update.updatedFields.concat([
      getObjectSchemaEffectiveKey(this.schema, this.schema.idProperty),
    ]);
    const updatedRow = Object.fromEntries(
      Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
    ) as GetSyncTableSchema<T>;

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
    row: {
      original?: GetSyncTableSchema<T>;
      updated: GetSyncTableSchema<T>;
    },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<GetSyncTableSchema<T>> => {
    const originalRow = row.original ?? {};
    const updatedRow = row.updated;
    const rowId = updatedRow.id;
    if (typeof rowId !== 'number') {
      throw new Error('handleUpdateJob only support ids as numbers');
    }

    const restParams = this.formatRowToApi(updatedRow) as UpdateParams<T>;
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
    } as GetSyncTableSchema<T>;
  };

  _updateWithMetafieldsGraphQl = async (
    row: {
      original?: GetSyncTableSchema<T>;
      updated: GetSyncTableSchema<T>;
    },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<GetSyncTableSchema<T>> => {
    const originalRow = row.original ?? {};
    const updatedRow = row.updated;
    const rowId = updatedRow.id;
    if (typeof rowId !== 'number') {
      throw new Error('handleUpdateJob only support ids as numbers');
    }

    const restParams = this.formatRowToApi(updatedRow) as UpdateParams<T>;
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
    } as GetSyncTableSchema<T>;
  };
  // #endregion
}
