// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CACHE_TEN_MINUTES, CODA_SUPPORTED_CURRENCIES } from '../constants';
import { SimpleRestNew } from '../Fetchers/SimpleRest';
import { validShopFields } from '../schemas/syncTable/ShopSchema';
import { cleanQueryParams } from '../helpers-rest';
import { SyncTableRestNew } from '../Fetchers/SyncTableRest';

import type { Shop } from '../typesNew/Resources/Shop';
import type { CurrencyCode } from '../typesNew/generated/admin.types';
import type { SyncTableType } from '../types/SyncTable';
import { shopResource } from '../allResources';

// #region Class
export type ShopSyncTableType = SyncTableType<typeof shopResource, Shop.Row, Shop.Params.Sync, never, never>;

export class ShopSyncTable extends SyncTableRestNew<ShopSyncTableType> {
  constructor(fetcher: ShopRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(shopResource, fetcher, params);
  }

  setSyncParams() {
    // const [syncMetafields] = this.codaParams as SyncTableParamValues<typeof Sync_Shops>;
    this.syncParams = cleanQueryParams({
      fields: this.effectiveStandardFromKeys.filter((key) => !['admin_url'].includes(key)).join(','),
    });
  }
}

export class ShopRestFetcher extends SimpleRestNew<ShopSyncTableType> {
  constructor(context: coda.ExecutionContext) {
    super(shopResource, context, true);
  }

  validateParams = (params: any) => {
    if (params.shopField) {
      if (validShopFields.indexOf(params.shopField) === -1) {
        throw new coda.UserVisibleError(`Unknown field '${params.shopField}' provided`);
      }
    }
    return true;
  };

  formatApiToRow = (shop): Shop.Row => {
    let obj: Shop.Row = {
      ...shop,
      admin_url: `${this.context.endpoint}/admin`,
    };
    return obj;
  };

  getActiveCurrency = async () => {
    let currencyCode = 'USD'; // default currency code

    const response = await this.fetch(undefined, {
      cacheTtlSecs: CACHE_TEN_MINUTES,
      forceSyncContextCache: true,
    });

    if (response?.body?.shop?.currency) {
      if (CODA_SUPPORTED_CURRENCIES.includes(response.body.shop.currency as any)) {
        currencyCode = response.body.shop.currency;
      } else {
        console.error(`Shop currency ${response.body.shop.currency} not supported. Falling back to ${currencyCode}.`);
      }
    }

    return currencyCode as CurrencyCode;
  };
}
// #endregion
