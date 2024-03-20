import * as coda from '@codahq/packs-sdk';

import { SimpleRest } from '../../Fetchers/SimpleRest';
import { CACHE_TEN_MINUTES, CODA_SUPPORTED_CURRENCIES } from '../../constants';
import { validShopFields } from '../../schemas/syncTable/ShopSchema';
import { CurrencyCode } from '../../types/admin.types';
import { Shop, shopResource } from './shopResource';
import { DEFAULT_CURRENCY_CODE } from '../../config/config';

export class ShopRestFetcher extends SimpleRest<Shop> {
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

  formatApiToRow = (shop): Shop['codaRow'] => {
    let obj: Shop['codaRow'] = {
      ...shop,
      admin_url: `${this.context.endpoint}/admin`,
    };
    return obj;
  };

  getActiveCurrency = async () => {
    let currencyCode = DEFAULT_CURRENCY_CODE;

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
