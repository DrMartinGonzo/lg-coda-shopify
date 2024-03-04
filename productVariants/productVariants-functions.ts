import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, makePostRequest } from '../helpers-rest';
import { ProductVariantSyncTableSchema } from '../schemas/syncTable/ProductVariantSchema';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { formatProductReference } from '../schemas/syncTable/ProductSchemaRest';
import { SimpleRest } from '../Fetchers/SimpleRest';
import { RestResourceName, RestResourcePlural } from '../types/RequestsRest';

import type { ProductVariantRow } from '../types/CodaRows';
import type { singleFetchData } from '../Fetchers/SimpleRest';
import type { FetchRequestOptions } from '../types/Requests';
import type { ProductVariantCreateRestParams, ProductVariantUpdateRestParams } from '../types/ProductVariant';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';
import type { Product as ProductRest } from '@shopify/shopify-api/rest/admin/2023-10/product';

// #region Class
export class ProductVariantRestFetcher extends SimpleRest<
  RestResourceName.ProductVariant,
  typeof ProductVariantSyncTableSchema
> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.ProductVariant, ProductVariantSyncTableSchema, context);
  }

  // TODO: write validateParams for product variants
  // validateParams = (params: any) => {
  //   return true;
  // };

  // TODO: find a more elegnt way to handle required prduct_id parameter without duplicating the whole create method
  create = (params: ProductVariantCreateRestParams, requestOptions: FetchRequestOptions = {}) => {
    this.validateParams(params);
    const payload = { [this.singular]: cleanQueryParams(params) };
    const url = coda.joinUrl(
      this.baseUrl,
      RestResourcePlural.Product,
      params.product_id.toString(),
      `${this.plural}.json`
    );
    return makePostRequest<singleFetchData<RestResourceName.ProductVariant>>(
      { ...requestOptions, url, payload },
      this.context
    );
  };

  formatRowToApi = (
    row: Partial<ProductVariantRow>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): ProductVariantUpdateRestParams | ProductVariantCreateRestParams | undefined => {
    let restParams: ProductVariantUpdateRestParams | ProductVariantCreateRestParams = {};
    let restCreateParams: ProductVariantCreateRestParams = {
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
  formatApiToRow = (variant): ProductVariantRow => {
    let obj: ProductVariantRow = {
      ...variant,
      admin_url: `${this.context.endpoint}/admin/products/${variant.product_id}/variants/${variant.id}`,
      product: formatProductReference(variant.product_id),
      // displayTitle: variant.title,
    };

    return obj;
  };

  /**
   * Formattage plus poussé d'une row ProductVariant wuand on a les données du produit parent.
   */
  formatRowWithParent = (row: ProductVariantRow, parentProduct: ProductRest): ProductVariantRow => {
    let obj: ProductVariantRow = {
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
    row: { original?: ProductVariantRow; updated: ProductVariantRow },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<ProductVariantRow> => this._updateWithMetafieldsGraphQl(row, metafieldKeyValueSets);
}

// #endregion
