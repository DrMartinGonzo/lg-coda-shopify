import * as coda from '@codahq/packs-sdk';

import type { MultipleFetchResponse, SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import { SyncTableRest } from '../../Fetchers/SyncTableRest';
import { arrayUnique, handleFieldDependencies } from '../../utils/helpers';
import { cleanQueryParams } from '../../helpers-rest';
import { productVariantFieldDependencies } from '../../schemas/syncTable/ProductVariantSchema';
import type { RestResources } from '../../Fetchers/ShopifyRestResource.types';
import { ProductRestFetcher } from '../products/ProductRestFetcher';
import { Product } from '../products/productResource';
import { ProductVariantRestFetcher } from './ProductVariantRestFetcher';
import { ProductVariant, productVariantResource } from './productVariantResource';
import type { Sync_ProductVariants } from './productVariants-coda';

export class ProductVariantSyncTable extends SyncTableRest<ProductVariant> {
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
  handleSyncTableResponse = (response): ProductVariant['codaRow'][] => {
    let parentProductResponse = response as MultipleFetchResponse<Product>;
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
    return [] as ProductVariant['codaRow'][];
  };
}
