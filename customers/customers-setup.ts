// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CustomerRestFetcher, CustomerSyncTable, formatCustomerDisplayValue } from './customers-functions';

import { CustomerSyncTableSchema } from '../schemas/syncTable/CustomerSchema';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../shared-parameters';
import { CACHE_DEFAULT } from '../constants';
import { augmentSchemaWithMetafields, parseMetafieldsCodaInput } from '../metafields/metafields-functions';
import { wrapGetSchemaForCli } from '../helpers';
import { MetafieldOwnerType } from '../types/admin.types';
import { Identity } from '../constants';

import type { CustomerRow } from '../typesNew/CodaRows';
import type { CustomerCreateRestParams } from '../types/Customer';

// #endregion

async function getCustomerSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = CustomerSyncTableSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(CustomerSyncTableSchema, MetafieldOwnerType.Customer, context);
  }
  // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

// #region Sync Tables
export const Sync_Customers = coda.makeSyncTable({
  name: 'Customers',
  description:
    'Return Customers from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Customer,
  schema: CustomerSyncTableSchema,
  dynamicOptions: {
    getSchema: getCustomerSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncCustomers',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      { ...filters.general.syncMetafields, optional: true },
      {
        ...filters.general.createdAtRange,
        optional: true,
        description: 'Sync only customers created in the given date range.',
      },
      {
        ...filters.general.updatedAtRange,
        optional: true,
        description: 'Sync only customers updated in the given date range.',
      },
      { ...filters.customer.idArray, optional: true },
    ],
    execute: async function (params, context: coda.SyncExecutionContext) {
      const [syncMetafields] = params;
      // If executing from CLI, schema is undefined, we have to retrieve it first
      const schema = context.sync.schema ?? (await wrapGetSchemaForCli(getCustomerSchema, context, { syncMetafields }));
      const customerSyncTable = new CustomerSyncTable(new CustomerRestFetcher(context), params);
      return customerSyncTable.executeSync(schema);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const customerSyncTable = new CustomerSyncTable(new CustomerRestFetcher(context), params);
      return customerSyncTable.executeUpdate(updates);
    },
  },
});
// #endregion

// #region Actions
export const Action_CreateCustomer = coda.makeFormula({
  name: 'CreateCustomer',
  description: `Create a new Shopify customer and return its ID.\nCustomer must have a name, phone number or email address.`,
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    // optional parameters
    { ...inputs.customer.firstName, description: "The customer's first name.", optional: true },
    { ...inputs.customer.lastName, description: "The customer's last name.", optional: true },
    {
      ...inputs.customer.email,
      description:
        'The unique email address of the customer. Attempting to assign the same email address to multiple customers returns an error.',
      optional: true,
    },
    {
      ...inputs.general.phone,
      description:
        'The unique phone number (E.164 format) for this customer.\nAttempting to assign the same phone number to multiple customers returns an error.',
      optional: true,
    },
    { ...inputs.customer.note, optional: true },
    { ...inputs.general.tagsArray, optional: true },
    { ...inputs.customer.acceptsEmailMarketing, optional: true },
    { ...inputs.customer.acceptsSmsMarketing, optional: true },
    {
      ...inputs.general.metafields,
      description: createOrUpdateMetafieldDescription('create', 'Customer'),
      optional: true,
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function (
    [first_name, last_name, email, phone, note, tags, accepts_email_marketing, accepts_sms_marketing, metafields],
    context
  ) {
    if (!first_name && !last_name && !email && !phone) {
      throw new coda.UserVisibleError('Customer must have a name, phone number or email address.');
    }

    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    let newRow: Partial<CustomerRow> = {
      email,
      first_name,
      last_name,
      phone,
      note,
      tags: tags ? tags.join(',') : undefined,
      accepts_email_marketing,
      accepts_sms_marketing,
    };

    const customerFetcher = new CustomerRestFetcher(context);
    const restParams = customerFetcher.formatRowToApi(newRow, metafieldKeyValueSets) as CustomerCreateRestParams;
    const response = await customerFetcher.create(restParams);
    return response?.body?.customer?.id;
  },
});

export const Action_UpdateCustomer = coda.makeFormula({
  name: 'UpdateCustomer',
  description: 'Update an existing Shopify customer and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.customer.id,

    // optional parameters
    { ...inputs.customer.firstName, optional: true },
    { ...inputs.customer.lastName, optional: true },
    { ...inputs.customer.email, optional: true },
    {
      ...inputs.general.phone,
      description:
        'The unique phone number (E.164 format) for this customer.\nAttempting to assign the same phone number to multiple customers returns an error.',
      optional: true,
    },
    {
      ...inputs.customer.note,
      description: 'A note about the customer.',
      optional: true,
    },
    { ...inputs.general.tagsArray, optional: true },
    { ...inputs.customer.acceptsEmailMarketing, optional: true },
    { ...inputs.customer.acceptsSmsMarketing, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('update', 'Customer'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(CustomerSchema, Identity.Customer),
  schema: CustomerSyncTableSchema,
  execute: async function (
    [
      customerId,
      first_name,
      last_name,
      email,
      phone,
      note,
      tags,
      accepts_email_marketing,
      accepts_sms_marketing,
      metafields,
    ],
    context
  ) {
    let row: CustomerRow = {
      id: customerId,
      accepts_email_marketing,
      accepts_sms_marketing,
      display: formatCustomerDisplayValue({ id: customerId, first_name, last_name, email }),
      email,
      first_name,
      last_name,
      note,
      phone,
      tags: tags ? tags.join(',') : undefined,
    };
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    return new CustomerRestFetcher(context).updateWithMetafields(
      { original: undefined, updated: row },
      metafieldKeyValueSets
    );
  },
});

export const Action_DeleteCustomer = coda.makeFormula({
  name: 'DeleteCustomer',
  description: 'Delete an existing Shopify customer and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.customer.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([customerId], context) {
    await new CustomerRestFetcher(context).delete(customerId);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Customer = coda.makeFormula({
  name: 'Customer',
  description: 'Return a single Customer from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.customer.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: CustomerSyncTableSchema,
  execute: async ([customerId], context) => {
    const customerFetcher = new CustomerRestFetcher(context);
    const response = await customerFetcher.fetch(customerId);
    if (response.body?.customer) {
      return customerFetcher.formatApiToRow(response.body.customer);
    }
  },
});

export const Format_Customer: coda.Format = {
  name: 'Customer',
  instructions: 'Paste the customer ID into the column.',
  formulaName: 'Customer',
};
// #endregion
