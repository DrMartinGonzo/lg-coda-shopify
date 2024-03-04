// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ShopRestFetcher } from './shop-functions';
import { CACHE_DEFAULT, IDENTITY_SHOP } from '../constants';
import { ShopSyncTableSchema } from '../schemas/syncTable/ShopSchema';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';

import type { ShopSyncRestParams } from '../types/Shop';
import type { multipleFetchData } from '../Fetchers/SimpleRest';
import type { RestResourceName } from '../types/RequestsRest';
import { filters } from '../shared-parameters';

// #endregion

// #region Sync Table
export const Sync_Shops = coda.makeSyncTable({
  name: 'Shops',
  description: 'Return Shop from specified account.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_SHOP,
  schema: ShopSyncTableSchema,
  formula: {
    name: 'SyncShops',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [],
    execute: async function ([], context: coda.SyncExecutionContext) {
      const schema = context.sync.schema ?? ShopSyncTableSchema;
      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);

      const restParams: ShopSyncRestParams = cleanQueryParams({
        fields: effectivePropertyKeys.filter((key) => !['admin_url'].includes(key)).join(','),
      });
      const shopFetcher = new ShopRestFetcher(context);

      let url = shopFetcher.getFetchAllUrl(restParams);
      let { response, continuation } = await makeSyncTableGetRequest<multipleFetchData<RestResourceName.Shop>>(
        { url },
        context
      );

      return {
        result: response?.body?.shop ? [shopFetcher.formatApiToRow(response.body.shop)] : [],
        continuation,
      };
    },
  },
});
// #endregion

// #region Formulas
export const Formula_Shop = coda.makeFormula({
  name: 'Shop',
  description: 'Get a single shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: ShopSyncTableSchema,
  execute: async function ([], context: coda.SyncExecutionContext) {
    const shopFetcher = new ShopRestFetcher(context);
    const response = await shopFetcher.fetch();
    if (response?.body?.shop) {
      return shopFetcher.formatApiToRow(response.body.shop);
    }
  },
});

// TODO: maybe no longer needed, we can use Formula_Shop and get the property directly from it
export const Formula_ShopField = coda.makeFormula({
  name: 'ShopField',
  description: 'Get a single shop field.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [filters.shop.shopField],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.String,
  execute: async function ([field], context: coda.SyncExecutionContext) {
    const shopFetcher = new ShopRestFetcher(context);
    shopFetcher.validateParams({ shopField: field });
    const response = await shopFetcher.fetch();
    if (response?.body?.shop[field]) {
      return response.body.shop[field];
    }
  },
});
// #endregion
