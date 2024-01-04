import * as coda from '@codahq/packs-sdk';

import { IDENTITY_PRODUCT, OPTIONS_PRODUCT_STATUS, OPTIONS_PUBLISHED_STATUS } from '../constants';
import { syncProducts, fetchProduct } from './products-functions';

import { ProductSchema } from './products-schema';
import { sharedParameters } from '../shared-parameters';

export const setupProducts = (pack) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Products',
    description: 'All Shopify products',
    identityName: IDENTITY_PRODUCT,
    schema: ProductSchema,
    formula: {
      name: 'SyncProducts',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'collection_id',
          description: 'Return products by product collection ID.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'created_at_max',
          description: 'Return products created before a specified date. (format: 2014-04-25T16:15:47-04:00).',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'created_at_min',
          description: 'Return products created after a specified date. (format: 2014-04-25T16:15:47-04:00).',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'handle',
          description: 'Return only products specified by a comma-separated list of product handles.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'ids',
          description: 'Return only products specified by a comma-separated list of product IDs.',
          optional: true,
        }),
        sharedParameters.maxEntriesPerRun,
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'presentment_currencies',
          description:
            'Return presentment prices in only certain currencies, specified by a comma-separated list of ISO 4217 currency codes.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'product_type',
          description: 'Return products by product type.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'published_at_max',
          description: 'Return products published before a specified date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'published_at_min',
          description: 'Return products published after a specified date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'published_status',
          description: 'Return products by their published status.',
          optional: true,
          autocomplete: OPTIONS_PUBLISHED_STATUS,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'since_id',
          description: 'Return only products after the specified ID.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'status',
          description: 'Return only products specified by a comma-separated list of statuses.',
          optional: true,
          autocomplete: OPTIONS_PRODUCT_STATUS,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'title',
          description: 'Return products by product title.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_max',
          description: 'Return products last updated before a specified date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_min',
          description: 'Return products last updated after a specified date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'vendor',
          description: 'Return products by product vendor.',
          optional: true,
        }),
      ],
      execute: syncProducts,
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Product',
    description: 'Get a single product data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'productID',
        description: 'The id of the product.',
      }),
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: ProductSchema,
    execute: fetchProduct,
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'Product',
    instructions: 'Get a single product data.',
    formulaName: 'Product',
  });
};
