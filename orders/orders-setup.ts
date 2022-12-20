import * as coda from '@codahq/packs-sdk';

import { OPTIONS_ORDER_FINANCIAL_STATUS, OPTIONS_ORDER_FULFILLMENT_STATUS, OPTIONS_ORDER_STATUS } from '../constants';
import { fetchAllOrders, fetchOrder, formatOrderForDocExport } from './orders-functions';

import { OrderSchema } from './orders-schema';

export const setupOrders = (pack) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Orders',
    description: 'All Shopify orders',
    identityName: 'Order',
    schema: OrderSchema,
    formula: {
      name: 'SyncOrders',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'status',
          autocomplete: OPTIONS_ORDER_STATUS,
          suggestedValue: 'any',
          description: 'Filter orders by their status.',
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'created_at_max',
          description: 'Show orders created at or before date.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'created_at_min',
          description: 'Show orders created at or after date.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'fields',
          description: 'Retrieve only certain fields, specified by a comma-separated list of fields names.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'financial_status',
          autocomplete: OPTIONS_ORDER_FINANCIAL_STATUS,
          suggestedValue: 'any',
          optional: true,
          description: 'Filter orders by their financial status.',
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'fulfillment_status',
          autocomplete: OPTIONS_ORDER_FULFILLMENT_STATUS,
          suggestedValue: 'any',
          optional: true,
          description: 'Filter orders by their fulfillment status.',
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'ids',
          description: 'Retrieve only orders specified by a comma-separated list of order IDs.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'limit',
          description: 'The maximum number of results to fetch by page.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'processed_at_max',
          description: 'Show orders imported at or before date.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'processed_at_min',
          description: 'Show orders imported at or after date.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'since_id',
          description: 'Show orders after the specified ID.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_max',
          description: 'Show orders last updated at or before date.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_min',
          description: 'Show orders last updated at or after date.',
          optional: true,
        }),
      ],
      execute: fetchAllOrders,
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Order',
    description: 'Get a single order data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'orderID',
        description: 'The id of the order.',
      }),
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: OrderSchema,
    execute: fetchOrder,
  });

  pack.addFormula({
    name: 'OrderExportFormat',
    description: 'Return JSON suitable for our custom lg-coda-export-documents pack.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'orderID',
        description: 'The id of the order.',
      }),
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.String,
    execute: async ([orderID], context) => {
      const order = await fetchOrder([orderID], context);
      return formatOrderForDocExport(order);
    },
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'Order',
    instructions: 'Retrieve a single order',
    formulaName: 'Order',
  });
};
