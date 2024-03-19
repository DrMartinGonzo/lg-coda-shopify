import * as coda from '@codahq/packs-sdk';

import { SyncTableParamValues, SyncTableRest } from '../../Fetchers/SyncTableRest';
import { handleFieldDependencies } from '../../utils/helpers';
import { cleanQueryParams } from '../../helpers-rest';
import { productFieldDependencies } from '../../schemas/syncTable/ProductSchemaRest';
import { ProductRestFetcher } from './ProductRestFetcher';
import { Product, productResource } from './productResource';
import { Sync_Products } from './products-coda';

export class ProductSyncTable extends SyncTableRest<Product> {
  constructor(fetcher: ProductRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(productResource, fetcher, params);
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
    ] = this.codaParams as SyncTableParamValues<typeof Sync_Products>;

    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, productFieldDependencies);
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
}
