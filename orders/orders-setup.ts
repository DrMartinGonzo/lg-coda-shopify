import * as coda from '@codahq/packs-sdk';

import {
  IS_ADMIN_RELEASE,
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
} from '../constants';
import { syncAllOrders, fetchOrder, fetchOrders, formatOrderForDocExport } from './orders-functions';
import { OrderSchema } from './orders-schema';
import { sharedParameters } from '../shared-parameters';

const requiredParameters = {
  orderId: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'orderID',
    description: 'The id of the order.',
  }),
};

const optionalParameters = {
  status: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'status',
    autocomplete: OPTIONS_ORDER_STATUS,
    suggestedValue: 'any',
    description: 'Filter orders by their status.',
    optional: true,
  }),
  created_at_max: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'created_at_max',
    description: 'Show orders created at or before date.',
    optional: true,
  }),
  created_at_min: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'created_at_min',
    description: 'Show orders created at or after date.',
    optional: true,
  }),
  financial_status: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'financial_status',
    autocomplete: OPTIONS_ORDER_FINANCIAL_STATUS,
    suggestedValue: 'any',
    optional: true,
    description: 'Filter orders by their financial status.',
  }),
  fulfillment_status: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fulfillment_status',
    autocomplete: OPTIONS_ORDER_FULFILLMENT_STATUS,
    suggestedValue: 'any',
    optional: true,
    description: 'Filter orders by their fulfillment status.',
  }),
  ids: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'ids',
    description: 'Retrieve only orders specified by a comma-separated list of order IDs.',
    optional: true,
  }),
  processed_at_max: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'processed_at_max',
    description: 'Show orders imported at or before date.',
    optional: true,
  }),
  processed_at_min: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'processed_at_min',
    description: 'Show orders imported at or after date.',
    optional: true,
  }),
  since_id: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'since_id',
    description: 'Show orders after the specified ID.',
    optional: true,
  }),
  updated_at_max: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'updated_at_max',
    description: 'Show orders last updated at or before date.',
    optional: true,
  }),
  updated_at_min: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'updated_at_min',
    description: 'Show orders last updated at or after date.',
    optional: true,
  }),
  fields: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fields',
    description: 'Comma separated string of fields to retrieve.',
    optional: true,
  }),
};

export const setupOrders = (pack) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  // Orders sync table
  pack.addSyncTable({
    name: 'Orders',
    description: 'All Shopify orders',
    identityName: 'Order',
    schema: OrderSchema,
    formula: {
      name: 'SyncOrders',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        optionalParameters.status,
        optionalParameters.created_at_max,
        optionalParameters.created_at_min,
        optionalParameters.financial_status,
        optionalParameters.fulfillment_status,
        optionalParameters.ids,
        sharedParameters.maxEntriesPerRun,
        optionalParameters.processed_at_max,
        optionalParameters.processed_at_min,
        optionalParameters.since_id,
        optionalParameters.updated_at_max,
        optionalParameters.updated_at_min,
      ],
      execute: syncAllOrders,
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  // Order formula
  pack.addFormula({
    name: 'Order',
    description: 'Get a single order data.',
    parameters: [requiredParameters.orderId],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: OrderSchema,
    execute: fetchOrder,
  });

  // Orders formula
  pack.addFormula({
    name: 'Orders',
    description: 'Get orders data.',
    parameters: [
      optionalParameters.status,
      optionalParameters.created_at_max,
      optionalParameters.created_at_min,
      optionalParameters.financial_status,
      optionalParameters.fulfillment_status,
      optionalParameters.ids,
      sharedParameters.maxEntriesPerRun,
      optionalParameters.processed_at_max,
      optionalParameters.processed_at_min,
      optionalParameters.since_id,
      optionalParameters.updated_at_max,
      optionalParameters.updated_at_min,
      optionalParameters.fields,
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Array,
    items: OrderSchema,
    execute: async function (
      [
        status,
        created_at_max,
        created_at_min,
        financial_status,
        fulfillment_status,
        ids,
        maxEntriesPerRun,
        processed_at_max,
        processed_at_min,
        since_id,
        updated_at_max,
        updated_at_min,
        fields,
      ],
      context
    ) {
      let items = [];
      let nextUrl: string;
      let run = true;
      while (run) {
        const res = await fetchOrders(
          status,
          created_at_max,
          created_at_min,
          financial_status,
          fulfillment_status,
          ids,
          maxEntriesPerRun,
          processed_at_max,
          processed_at_min,
          since_id,
          updated_at_max,
          updated_at_min,
          fields,
          nextUrl,
          context
        );

        items = items.concat(res.items);
        nextUrl = res.nextUrl;
        if (!nextUrl) run = false;
      }

      return items;
    },
  });

  if (IS_ADMIN_RELEASE) {
    // OrderExportFormat formula
    pack.addFormula({
      name: 'OrderExportFormat',
      description: 'Return JSON suitable for our custom lg-coda-export-documents pack.',
      parameters: [requiredParameters.orderId],
      cacheTtlSecs: 10,
      resultType: coda.ValueType.String,
      execute: async ([orderID], context) => {
        const order = await fetchOrder([orderID], context);
        return formatOrderForDocExport(order);
      },
    });
  }

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  // Order column format
  pack.addColumnFormat({
    name: 'Order',
    instructions: 'Retrieve a single order',
    formulaName: 'Order',
  });
};
