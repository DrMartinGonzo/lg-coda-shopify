import * as coda from '@codahq/packs-sdk';

import { syncCustomers, fetchCustomer, updateCustomer, deleteCustomer, createCustomer } from './customers-functions';

import { CustomerSchema } from './customers-schema';
import { sharedParameters } from '../shared-parameters';
import { IDENTITY_CUSTOMER } from '../constants';

const parameters = {
  customerGID: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'customerGid',
    description: 'The GraphQL GID of the customer.',
  }),
  // Optional input parameters
  inputFirstName: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'firstName',
    description: "The customer's first name.",
    optional: true,
  }),
  inputLastName: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'lastName',
    description: "The customer's last name.",
    optional: true,
  }),
  inputEmail: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'email',
    description:
      'The unique email address of the customer. Attempting to assign the same email address to multiple customers returns an error.',
    optional: true,
  }),
  inputNote: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'note',
    description: 'A note about the customer.',
    optional: true,
  }),
  inputPhone: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'phone',
    description:
      'The unique phone number (E.164 format) for this customer.\nAttempting to assign the same phone number to multiple customers returns an error.',
    optional: true,
  }),
  inputTags: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'tags',
    description:
      'Tags attached to the customer, formatted as a string of comma-separated values.\nA customer can have up to 250 tags. Each tag can have up to 255 characters.',
    optional: true,
  }),
};

export const setupCustomers = (pack: coda.PackDefinitionBuilder) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Customers',
    description: 'Return Customers from this shop.',
    identityName: IDENTITY_CUSTOMER,
    schema: CustomerSchema,
    formula: {
      name: 'SyncCustomers',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        { ...sharedParameters.filterCreatedAtMax, optional: true },
        { ...sharedParameters.filterCreatedAtMin, optional: true },
        { ...sharedParameters.filterIds, optional: true },
        { ...sharedParameters.filterSinceId, optional: true },
        { ...sharedParameters.filterUpdatedAtMax, optional: true },
        { ...sharedParameters.filterUpdatedAtMin, optional: true },
      ],
      execute: syncCustomers,
      maxUpdateBatchSize: 10,
      executeUpdate: async function (args, updates, context: coda.SyncExecutionContext) {
        const jobs = updates.map(async (update) => {
          const { updatedFields } = update;
          const customerGid = update.previousValue.admin_graphql_api_id;

          const fields = {};
          updatedFields.forEach((key) => {
            fields[key] = update.newValue[key];
          });
          const newValues = await updateCustomer(customerGid, fields, context);
          return newValues;
        });

        // Wait for all of the jobs to finish .
        let completed = await Promise.allSettled(jobs);

        return {
          // For each update, return either the updated row
          // or an error if the update failed.
          result: completed.map((job) => {
            if (job.status === 'fulfilled') {
              return job.value;
            } else {
              return job.reason;
            }
          }),
        };
      },
    },
  });

  /**====================================================================================================================
   *    Actions
   *===================================================================================================================== */
  // an action to update a customer
  pack.addFormula({
    name: 'UpdateCustomer',
    description: 'Update an existing Shopify customer and return the updated data.',
    parameters: [
      parameters.customerGID,
      // Optional input parameters
      parameters.inputFirstName,
      parameters.inputLastName,
      parameters.inputEmail,
      parameters.inputPhone,
      parameters.inputNote,
      parameters.inputTags,
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    schema: coda.withIdentity(CustomerSchema, IDENTITY_CUSTOMER),
    execute: async function ([customerGid, first_name, last_name, email, phone, note, tags], context) {
      return updateCustomer(
        customerGid,
        {
          first_name,
          last_name,
          email,
          phone,
          note,
          tags,
        },
        context
      );
    },
  });

  // an action to create a customer
  pack.addFormula({
    name: 'CreateCustomer',
    description: `Create a new Shopify customer and return GraphQl GID.\nCustomer must have a name, phone number or email address.`,
    parameters: [
      parameters.inputFirstName,
      parameters.inputLastName,
      parameters.inputEmail,
      parameters.inputPhone,
      parameters.inputNote,
      parameters.inputTags,
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async function ([first_name, last_name, email, phone, note, tags], context) {
      if (!first_name && !last_name && !email && !phone) {
        throw new coda.UserVisibleError('Customer must have a name, phone number or email address.');
      }

      const response = await createCustomer(
        {
          first_name,
          last_name,
          email,
          phone,
          note,
          tags,
        },
        context
      );
      const { body } = response;
      return body.customer.admin_graphql_api_id;
    },
  });

  // an action to delete a customer
  pack.addFormula({
    name: 'DeleteCustomer',
    description: 'Delete an existing Shopify customer and return true on success.',
    parameters: [parameters.customerGID],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async function ([customerGid], context) {
      await deleteCustomer([customerGid], context);
      return true;
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Customer',
    description: 'Return a single customer from this shop.',
    parameters: [parameters.customerGID],
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
    instructions: 'Paste the GraphQL GID of the customer into the column.',
    formulaName: 'Customer',
  });
};
