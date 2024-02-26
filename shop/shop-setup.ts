// #region Imports
import * as coda from '@codahq/packs-sdk';

import { fetchShopRest, formatShopForSchemaFromRest } from './shop-functions';
import { CACHE_DEFAULT, IDENTITY_SHOP, REST_DEFAULT_API_VERSION } from '../constants';
import { ShopSchema } from '../schemas/syncTable/ShopSchema';
import { SyncTableRestContinuation } from '../types/tableSync';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';

// #endregion

const validShopFields = Object.keys(ShopSchema.properties)
  .map((key) => ShopSchema.properties[key].fromKey)
  .filter(Boolean);

// #region Sync Table
export const Sync_Shops = coda.makeSyncTable({
  name: 'Shops',
  description: 'Return Shop from specified account.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_SHOP,
  schema: ShopSchema,
  formula: {
    name: 'SyncShops',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [],
    execute: async function ([], context: coda.SyncExecutionContext) {
      const schema = context.sync.schema ?? ShopSchema;
      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);

      const restParams = cleanQueryParams({
        fields: effectivePropertyKeys.filter((key) => !['admin_url'].includes(key)).join(','),
      });

      let url = coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/shop.json`, restParams);

      let restResult = [];
      let { response, continuation } = await makeSyncTableGetRequest({ url }, context);
      if (response?.body?.shop) {
        restResult = [formatShopForSchemaFromRest(response.body.shop, context)];
      }

      return { result: restResult, continuation };
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
  schema: ShopSchema,
  execute: async function ([], context: coda.SyncExecutionContext) {
    const shop = await fetchShopRest(undefined, context);
    if (shop) return formatShopForSchemaFromRest(shop, context);
  },
});

// TODO: maybe no longer needed, we can use Formula_Shop and get the property directly from it
export const Formula_ShopField = coda.makeFormula({
  name: 'ShopField',
  description: 'Get a single shop field.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'field',
      description: 'shop field to return',
      autocomplete: validShopFields,
    }),
  ],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.String,
  execute: async function ([field], context: coda.SyncExecutionContext) {
    if (validShopFields.indexOf(field) === -1) {
      throw new coda.UserVisibleError(`Unknown field '${field}' provided`);
    }
    const shop = await fetchShopRest([field], context);
    if (shop && shop[field]) return shop[field];
  },
});
// #endregion
