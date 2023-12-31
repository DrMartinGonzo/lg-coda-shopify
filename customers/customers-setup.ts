import * as coda from '@codahq/packs-sdk';

import { fetchAllCustomers, fetchCustomer } from './customers-functions';

import { CustomerSchema } from './customers-schema';
import { sharedParameters } from '../shared-parameters';

export const setupCustomers = (pack) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Customers',
    description: 'All Shopify customers',
    identityName: 'Customer',
    schema: CustomerSchema,
    formula: {
      name: 'SyncCustomers',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'created_at_max',
          description: 'Show customers created at or before date.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'created_at_min',
          description: 'Show customers created at or after date.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'ids',
          description: 'Retrieve only customers specified by a comma-separated list of order IDs.',
          optional: true,
        }),
        sharedParameters.maxEntriesPerRun,
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'since_id',
          description: 'Show customers after the specified ID.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_max',
          description: 'Show customers last updated at or before date.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_min',
          description: 'Show customers last updated at or after date.',
          optional: true,
        }),
      ],
      execute: fetchAllCustomers,
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Customer',
    description: 'Get a single customer data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'customerID',
        description: 'The id of the customer.',
      }),
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: CustomerSchema,
    execute: fetchCustomer,
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'Customer',
    instructions: 'Get a single customer data.',
    formulaName: 'Customer',
  });
};
