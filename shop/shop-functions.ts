// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CACHE_TEN_MINUTES, CODA_SUPPORTED_CURRENCIES } from '../constants';
import { SimpleRest } from '../Fetchers/SimpleRest';
import { RestResourceName } from '../types/RequestsRest';
import { ShopSyncTableSchema, validShopFields } from '../schemas/syncTable/ShopSchema';

import type { ShopRow } from '../types/CodaRows';
import type { CurrencyCode } from '../types/admin.types';

// #endregion

// #region Class
export class ShopRestFetcher extends SimpleRest<RestResourceName.Shop, typeof ShopSyncTableSchema> {
  constructor(context: coda.ExecutionContext) {
    super(RestResourceName.Shop, ShopSyncTableSchema, context);
  }

  validateParams = (params: any) => {
    if (params.shopField) {
      if (validShopFields.indexOf(params.shopField) === -1) {
        throw new coda.UserVisibleError(`Unknown field '${params.shopField}' provided`);
      }
    }
    return true;
  };

  formatApiToRow = (shop): ShopRow => {
    let obj: ShopRow = {
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
