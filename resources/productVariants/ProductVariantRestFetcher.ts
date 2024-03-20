import * as coda from '@codahq/packs-sdk';

import { cleanQueryParams, makePostRequest } from '../../helpers-rest';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { formatProductReference } from '../../schemas/syncTable/ProductSchemaRest';
import { SimpleRest } from '../../Fetchers/SimpleRest';
import { RestResourcePlural } from '../../Fetchers/ShopifyRestResource.types';
import { ProductRestFetcher } from '../products/ProductRestFetcher';
import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { ProductVariant, productVariantResource } from './productVariantResource';
import { SingleFetchData } from '../../Fetchers/SyncTableRest';

export class ProductVariantRestFetcher extends SimpleRest<ProductVariant> {
  constructor(context: coda.ExecutionContext) {
    super(productVariantResource, context);
  }

  // Edge case: we fetch product variants data from products endpoint
  getFetchAllUrl = (params?: ProductVariant['rest']['params']['sync']): string =>
    coda.withQueryParams(
      new ProductRestFetcher(this.context).getResourcesUrl(),
      params ? cleanQueryParams(params) : {}
    );

  // TODO: write validateParams for product variants
  // validateParams = (params: any) => {
  //   return true;
  // };
  // TODO: find a more elegant way to handle required product_id parameter without duplicating the whole create method
  create = (params: ProductVariant['rest']['params']['create'], requestOptions: FetchRequestOptions = {}) => {
    this.validateParams(params);
    const payload = { [this.singular]: cleanQueryParams(params) };
    const url = coda.joinUrl(
      this.baseUrl,
      RestResourcePlural.Product,
      params.product_id.toString(),
      `${this.plural}.json`
    );
    return makePostRequest<SingleFetchData<ProductVariant>>({ ...requestOptions, url, payload }, this.context);
  };

  formatRowToApi = (
    row: Partial<ProductVariant['codaRow']>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): ProductVariant['rest']['params']['update'] | ProductVariant['rest']['params']['create'] | undefined => {
    let restParams: ProductVariant['rest']['params']['update'] | ProductVariant['rest']['params']['create'] = {};
    let restCreateParams: ProductVariant['rest']['params']['create'] = {
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
  formatApiToRow = (variant): ProductVariant['codaRow'] => {
    let obj: ProductVariant['codaRow'] = {
      ...variant,
      admin_url: `${this.context.endpoint}/admin/products/${variant.product_id}/variants/${variant.id}`,
      product: formatProductReference(variant.product_id),
      price: variant.price ? parseFloat(variant.price) : undefined,
      compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : undefined,
      weight: variant.weight ? parseFloat(variant.weight) : undefined,
      // displayTitle: variant.title,
    };

    return obj;
  };

  /**
   * Formattage plus poussé d'une row ProductVariant quand on a les données du produit parent.
   */
  formatRowWithParent = (row: ProductVariant['codaRow'], parentProduct): ProductVariant['codaRow'] => {
    let obj: ProductVariant['codaRow'] = {
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
    row: { original?: ProductVariant['codaRow']; updated: ProductVariant['codaRow'] },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<ProductVariant['codaRow']> => this._updateWithMetafieldsGraphQl(row, metafieldKeyValueSets);
}
