import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, makePostRequest } from '../helpers-rest';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { formatProductReference } from '../schemas/syncTable/ProductSchemaRest';
import { SimpleRestNew } from '../Fetchers/SimpleRest';
import { RestResourcePlural } from '../typesNew/ShopifyRestResourceTypes';
import { SyncTableRestNew } from '../Fetchers/SyncTableRest';
import { productVariantFieldDependencies } from '../schemas/syncTable/ProductVariantSchema';
import { arrayUnique, handleFieldDependencies } from '../helpers';
import { ProductRestFetcher, ProductSyncTableType } from '../products/products-functions';

import type { ProductVariant } from '../typesNew/Resources/ProductVariant';
import type { RestResources } from '../typesNew/ShopifyRestResourceTypes';
import type {
  GetSyncParams,
  MultipleFetchResponse,
  SingleFetchData,
  SyncTableParamValues,
} from '../Fetchers/SyncTableRest';
import type { FetchRequestOptions } from '../typesNew/Fetcher';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';
import type { Sync_ProductVariants } from './productVariants-setup';
import type { SyncTableType } from '../types/SyncTable';
import { productVariantResource } from '../allResources';

// #region Class
export type ProductVariantSyncTableType = SyncTableType<
  typeof productVariantResource,
  ProductVariant.Row,
  ProductVariant.Params.Sync,
  ProductVariant.Params.Create,
  ProductVariant.Params.Update
>;

export class ProductVariantSyncTable extends SyncTableRestNew<ProductVariantSyncTableType> {
  constructor(fetcher: ProductRestFetcher | ProductVariantRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    // TODO: fix fetcher type error
    super(productVariantResource, fetcher as any, params);
  }

  setSyncParams() {
    const [
      product_type,
      syncMetafields,
      created_at,
      updated_at,
      published_at,
      status,
      published_status,
      vendor,
      handles,
      ids,
    ] = this.codaParams as SyncTableParamValues<typeof Sync_ProductVariants>;

    const requiredProductFields = ['id', 'variants'];
    const possibleProductFields = ['id', 'title', 'status', 'images', 'handle', 'variants'];

    // Handle product variant field dependencies and only keep the ones that are actual product fields
    const syncedStandardFields = arrayUnique(
      handleFieldDependencies(this.effectiveStandardFromKeys, productVariantFieldDependencies)
        .concat(requiredProductFields)
        .filter((fromKey) => possibleProductFields.includes(fromKey))
    );

    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
      handle: handles && handles.length ? handles.join(',') : undefined,
      ids: ids && ids.length ? ids.join(',') : undefined,
      product_type,
      published_status,
      status: status && status.length ? status.join(',') : undefined,
      vendor,
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      published_at_min: published_at ? published_at[0] : undefined,
      published_at_max: published_at ? published_at[1] : undefined,
    });
  }

  // TODO: more elegant way when a resource depends on a parent resource
  handleSyncTableResponse = (response): ProductVariant.Row[] => {
    let parentProductResponse = response as MultipleFetchResponse<ProductSyncTableType>;
    if (parentProductResponse?.body?.products) {
      const products = parentProductResponse.body.products as unknown as RestResources['Product'][];
      return products
        .map((product) =>
          product.variants.map((variant) => {
            if (this.fetcher instanceof ProductVariantRestFetcher) {
              const variantRow = this.fetcher.formatApiToRow(variant);
              return this.fetcher.formatRowWithParent(variantRow, product);
            }
          })
        )
        .flat();
    }
    return [] as ProductVariant.Row[];
  };
}

export class ProductVariantRestFetcher extends SimpleRestNew<ProductVariantSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(productVariantResource, context);
  }

  // Edge case: we fetch product variants data from products endpoint
  getFetchAllUrl = (params?: GetSyncParams<ProductVariantSyncTableType>): string =>
    coda.withQueryParams(
      new ProductRestFetcher(this.context).getResourcesUrl(),
      params ? cleanQueryParams(params) : {}
    );

  // TODO: write validateParams for product variants
  // validateParams = (params: any) => {
  //   return true;
  // };

  // TODO: find a more elegant way to handle required product_id parameter without duplicating the whole create method
  create = (params: ProductVariant.Params.Create, requestOptions: FetchRequestOptions = {}) => {
    this.validateParams(params);
    const payload = { [this.singular]: cleanQueryParams(params) };
    const url = coda.joinUrl(
      this.baseUrl,
      RestResourcePlural.Product,
      params.product_id.toString(),
      `${this.plural}.json`
    );
    return makePostRequest<SingleFetchData<ProductVariantSyncTableType>>(
      { ...requestOptions, url, payload },
      this.context
    );
  };

  formatRowToApi = (
    row: Partial<ProductVariant.Row>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): ProductVariant.Params.Update | ProductVariant.Params.Create | undefined => {
    let restParams: ProductVariant.Params.Update | ProductVariant.Params.Create = {};
    let restCreateParams: ProductVariant.Params.Create = {
      product_id: row.product?.id,
      option1: row.option1,
    };

    if (row.barcode !== undefined) restParams.barcode = row.barcode;
    if (row.compare_at_price !== undefined) restParams.compare_at_price = row.compare_at_price;
    if (row.option1 !== undefined) restParams.option1 = row.option1;
    if (row.option2 !== undefined) restParams.option2 = row.option2;
    if (row.option3 !== undefined) restParams.option3 = row.option3;
    if (row.price !== undefined) restParams.price = row.price;
    if (row.position !== undefined) restParams.position = row.position;
    if (row.sku !== undefined) restParams.sku = row.sku;
    if (row.taxable !== undefined) restParams.taxable = row.taxable;
    if (row.weight !== undefined) restParams.weight = row.weight;
    if (row.weight_unit !== undefined) restParams.weight_unit = row.weight_unit;

    // Create only paramters
    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restCreateParams.metafields = metafieldRestInputs;
    }

    const mergedParams = { ...restParams, ...restCreateParams };

    // Means we have nothing to update/create
    if (Object.keys(mergedParams).length === 0) return undefined;
    return mergedParams;
  };

  /**
   * Formatte une row ProductVariant.
   * On peut formatter de façon plus précise quand on a accès aux données du
   * produit parent en appliquant ensuite la methode formatRowWithParent.
   */
  formatApiToRow = (variant): ProductVariant.Row => {
    let obj: ProductVariant.Row = {
      ...variant,
      admin_url: `${this.context.endpoint}/admin/products/${variant.product_id}/variants/${variant.id}`,
      product: formatProductReference(variant.product_id),
      // displayTitle: variant.title,
    };

    return obj;
  };

  /**
   * Formattage plus poussé d'une row ProductVariant quand on a les données du produit parent.
   */
  formatRowWithParent = (row: ProductVariant.Row, parentProduct): ProductVariant.Row => {
    let obj: ProductVariant.Row = {
      ...row,
      product: formatProductReference(parentProduct.id, parentProduct?.title),
      displayTitle: `${parentProduct.title} - ${row.title}`,
    };

    if (parentProduct?.status === 'active' && parentProduct?.handle) {
      obj.storeUrl = `${this.context.endpoint}/${RestResourcePlural.Product}/${parentProduct.handle}?variant=${row.id}`;
    }
    if (row.image_id && parentProduct?.images && parentProduct?.images.length > 0) {
      obj.image = parentProduct.images.find((image) => image.id === row.image_id)?.src;
    }

    return obj;
  };

  updateWithMetafields = async (
    row: { original?: ProductVariant.Row; updated: ProductVariant.Row },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<ProductVariant.Row> => this._updateWithMetafieldsGraphQl(row, metafieldKeyValueSets);
}

// #endregion
