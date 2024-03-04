// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CustomerRestFetcher, formatCustomerDisplayValue } from './customers-functions';

import { CustomerSyncTableSchema, customerFieldDependencies } from '../schemas/syncTable/CustomerSchema';
import { filters, inputs } from '../shared-parameters';
import { CACHE_DEFAULT, IDENTITY_CUSTOMER, REST_DEFAULT_LIMIT } from '../constants';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  getMetaFieldFullKey,
  parseMetafieldsCodaInput,
  preprendPrefixToMetaFieldKey,
} from '../metafields/metafields-functions';
import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { arrayUnique, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  getMixedSyncTableRemainingAndToProcessItems,
  graphQlGidToId,
  makeMixedSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { QueryCustomersMetafieldsAdmin, buildCustomersSearchQuery } from './customers-graphql';
import { GetCustomersMetafieldsQuery, GetCustomersMetafieldsQueryVariables } from '../types/admin.generated';
import { MetafieldOwnerType } from '../types/admin.types';

import type { Customer as CustomerRest } from '@shopify/shopify-api/rest/admin/2023-10/customer';
import type { CustomerRow } from '../types/CodaRows';
import type { CustomerCreateRestParams, CustomerSyncTableRestParams } from '../types/Customer';
import type { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';

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
  identityName: IDENTITY_CUSTOMER,
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
    execute: async function ([syncMetafields, created_at, updated_at, ids], context: coda.SyncExecutionContext) {
      // If executing from CLI, schema is undefined, we have to retrieve it first
      const schema = context.sync.schema ?? (await wrapGetSchemaForCli(getCustomerSchema, context, { syncMetafields }));
      const prevContinuation = context.sync.continuation as SyncTableMixedContinuation;
      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
      const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
        separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

      const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(removePrefixFromMetaFieldKey);
      const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

      let restLimit = REST_DEFAULT_LIMIT;
      let maxEntriesPerRun = restLimit;
      let shouldDeferBy = 0;

      if (shouldSyncMetafields) {
        const defaultMaxEntriesPerRun = 250;
        const syncTableMaxEntriesAndDeferWait = await getGraphQlSyncTableMaxEntriesAndDeferWait(
          defaultMaxEntriesPerRun,
          prevContinuation,
          context
        );
        maxEntriesPerRun = syncTableMaxEntriesAndDeferWait.maxEntriesPerRun;
        restLimit = maxEntriesPerRun;
        shouldDeferBy = syncTableMaxEntriesAndDeferWait.shouldDeferBy;
        if (shouldDeferBy > 0) {
          return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
        }
      }

      let restItems: Array<CustomerRow> = [];
      let restContinuation: SyncTableRestContinuation | null = null;
      const skipNextRestSync = prevContinuation?.extraContinuationData?.skipNextRestSync ?? false;

      // Rest Admin API Sync
      if (!skipNextRestSync) {
        const syncedStandardFields = handleFieldDependencies(standardFromKeys, customerFieldDependencies);
        const restParams = cleanQueryParams({
          fields: syncedStandardFields.join(', '),
          limit: restLimit,
          ids: ids && ids.length ? ids.join(',') : undefined,
          created_at_min: created_at ? created_at[0] : undefined,
          created_at_max: created_at ? created_at[1] : undefined,
          updated_at_min: updated_at ? updated_at[0] : undefined,
          updated_at_max: updated_at ? updated_at[1] : undefined,
        } as CustomerSyncTableRestParams);

        const customerFetcher = new CustomerRestFetcher(context);
        customerFetcher.validateParams(restParams);

        const url = prevContinuation?.nextUrl
          ? coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit })
          : customerFetcher.getFetchAllUrl(restParams);
        const { response, continuation } = await makeSyncTableGetRequest<{ customers: CustomerRest[] }>(
          { url },
          context
        );
        restContinuation = continuation;

        if (response?.body?.customers) {
          restItems = response.body.customers.map(customerFetcher.formatApiToRow);
        }

        if (!shouldSyncMetafields) {
          return {
            result: restItems,
            continuation: restContinuation,
          };
        }
      }

      // GraphQL Admin API metafields augmented Sync
      if (shouldSyncMetafields) {
        const { toProcess, remaining } = getMixedSyncTableRemainingAndToProcessItems(
          prevContinuation,
          restItems,
          maxEntriesPerRun
        );
        const uniqueIdsToFetch = arrayUnique(toProcess.map((c) => c.id)).sort();
        const graphQlPayload = {
          query: QueryCustomersMetafieldsAdmin,
          variables: {
            maxEntriesPerRun,
            metafieldKeys: effectiveMetafieldKeys,
            countMetafields: effectiveMetafieldKeys.length,
            cursor: prevContinuation?.cursor,
            searchQuery: buildCustomersSearchQuery({ ids: uniqueIdsToFetch }),
          } as GetCustomersMetafieldsQueryVariables,
        };

        let { response: augmentedResponse, continuation: augmentedContinuation } =
          await makeMixedSyncTableGraphQlRequest(
            {
              payload: graphQlPayload,
              maxEntriesPerRun,
              prevContinuation: prevContinuation as unknown as SyncTableMixedContinuation,
              nextRestUrl: restContinuation?.nextUrl,
              extraContinuationData: {
                currentBatch: {
                  remaining: remaining,
                  processing: toProcess,
                },
              },
              getPageInfo: (data: GetCustomersMetafieldsQuery) => data.customers?.pageInfo,
            },
            context
          );

        if (augmentedResponse?.body?.data) {
          const customersData = augmentedResponse.body.data as GetCustomersMetafieldsQuery;
          const augmentedItems = toProcess
            .map((resource) => {
              const graphQlNodeMatch = customersData.customers.nodes.find((c) => graphQlGidToId(c.id) === resource.id);

              // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
              if (!graphQlNodeMatch) return;

              if (graphQlNodeMatch?.metafields?.nodes?.length) {
                graphQlNodeMatch.metafields.nodes.forEach((metafield) => {
                  const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
                  resource[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
                });
              }
              return resource;
            })
            .filter((p) => p); // filter out undefined items

          return {
            result: augmentedItems,
            continuation: augmentedContinuation,
          };
        }

        return {
          result: [],
          continuation: augmentedContinuation,
        };
      }

      return {
        result: [],
      };
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return new CustomerRestFetcher(context).executeSyncTableUpdate(updates);
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
    { ...inputs.general.metafields, description: 'Customer metafields to create.', optional: true },
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
    { ...inputs.general.metafields, optional: true, description: 'Customer metafields to update.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(CustomerSchema, IDENTITY_CUSTOMER),
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
