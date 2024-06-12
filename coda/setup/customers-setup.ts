// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CustomerClient } from '../../Clients/RestApiClientBase';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { PACK_IDENTITIES } from '../../constants';
import { CustomerModel } from '../../models/rest/CustomerModel';
import { CustomerSyncTableSchema } from '../../schemas/syncTable/CustomerSchema';
import { SyncedCustomers } from '../../sync/rest/SyncedCustomers';
import { makeDeleteRestResourceAction, makeFetchSingleRestResourceAction } from '../../utils/coda-utils';
import { CodaMetafieldSetNew } from '../CodaMetafieldSetNew';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';

// #endregion

// #region Helper functions
function createSyncedCustomers(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedCustomers({
    context,
    codaSyncParams,
    model: CustomerModel,
    client: CustomerClient.createInstance(context),
  });
}

function validateCreateParams({
  first_name,
  last_name,
  email,
  phone,
}: {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}) {
  const invalidMsg: string[] = [];
  if (!first_name && !last_name && !email && !phone) {
    invalidMsg.push('Customer must have a name, phone number or email address.');
  }
  if (invalidMsg.length) {
    throw new InvalidValueVisibleError(invalidMsg.join(', '));
  }
}
// #endregion

// #region Sync Tables
export const Sync_Customers = coda.makeSyncTable({
  name: 'Customers',
  description:
    'Return Customers from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Customer,
  schema: SyncedCustomers.staticSchema,
  dynamicOptions: {
    getSchema: async (context, _, formulaContext) =>
      SyncedCustomers.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] }),
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncCustomers',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedCustomers.codaParamsMap}
     */
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
      { ...filters.customer.tags, optional: true },
    ],
    execute: async (codaSyncParams, context) => createSyncedCustomers(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedCustomers(codaSyncParams, context).executeSyncUpdate(updates),
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
    validateCreateParams({ first_name, last_name, email, phone });
    const customer = CustomerModel.createInstanceFromRow(context, {
      id: undefined,
      email,
      first_name,
      last_name,
      phone,
      note,
      tags: tags ? tags.join(',') : undefined,
      accepts_email_marketing,
      accepts_sms_marketing,
    });
    if (metafields) {
      customer.data.metafields = CodaMetafieldSetNew.createFromCodaParameterArray(metafields).map((s) =>
        s.toGraphQlMetafield({ context, ownerType: CustomerModel.metafieldGraphQlOwnerType })
      );
    }

    await customer.save();
    return customer.data.id;
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
  // schema: coda.withIdentity(CustomerSchema, IdentitiesNew.customer),
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
    const customer = CustomerModel.createInstanceFromRow(context, {
      id: customerId,
      accepts_email_marketing,
      accepts_sms_marketing,
      email,
      first_name,
      last_name,
      note,
      phone,
      tags: tags ? tags.join(',') : undefined,
    });
    if (metafields) {
      customer.data.metafields = CodaMetafieldSetNew.createGraphQlMetafieldsFromCodaParameterArray(context, {
        codaParams: metafields,
        ownerType: CustomerModel.metafieldGraphQlOwnerType,
        ownerGid: customer.graphQlGid,
      });
    }

    await customer.save();
    return customer.toCodaRow();
  },
});

export const Action_DeleteCustomer = makeDeleteRestResourceAction({
  modelName: CustomerModel.displayName,
  IdParameter: inputs.customer.id,
  execute: async ([itemId], context) => {
    await CustomerClient.createInstance(context).delete({ id: itemId as number });
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Customer = makeFetchSingleRestResourceAction({
  modelName: CustomerModel.displayName,
  IdParameter: inputs.customer.id,
  schema: SyncedCustomers.staticSchema,
  execute: async ([itemId], context) => {
    const response = await CustomerClient.createInstance(context).single({ id: itemId as number });
    return CustomerModel.createInstance(context, response.body).toCodaRow();
  },
});

export const Format_Customer: coda.Format = {
  name: 'Customer',
  instructions: 'Paste the customer ID into the column.',
  formulaName: 'Customer',
};
// #endregion
