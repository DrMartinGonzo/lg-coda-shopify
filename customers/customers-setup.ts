// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  deleteCustomer,
  createCustomerRest,
  formatCustomerForSchemaFromRestApi,
  handleCustomerUpdateJob,
  fetchSingleCustomerRest,
  updateCustomerRest,
} from './customers-functions';

import {
  CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN,
  CONSENT_STATE__SUBSCRIBED,
  CONSENT_STATE__UNSUBSCRIBED,
  CustomerSyncTableSchema,
  customerFieldDependencies,
} from '../schemas/syncTable/CustomerSchema';
import { sharedParameters } from '../shared-parameters';
import {
  CACHE_DEFAULT,
  IDENTITY_CUSTOMER,
  METAFIELD_PREFIX_KEY,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  formatMetafieldRestInputFromMetafieldKeyValueSet,
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
  updateAndFormatResourceMetafieldsGraphQl,
} from '../metafields/metafields-functions';
import { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';
import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { arrayUnique, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  getMixedSyncTableRemainingAndToProcessItems,
  graphQlGidToId,
  idToGraphQlGid,
  makeMixedSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { QueryCustomersMetafieldsAdmin, buildCustomersSearchQuery } from './customers-graphql';
import { GetCustomersMetafieldsQuery, GetCustomersMetafieldsQueryVariables } from '../types/admin.generated';
import { CustomerCreateRestParams, CustomerSyncRestParams, CustomerUpdateRestParams } from '../types/Customer';
import { MetafieldOwnerType } from '../types/admin.types';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';

// #endregion

async function getCustomerSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = CustomerSyncTableSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(CustomerSyncTableSchema, MetafieldOwnerType.Customer, context);
  }
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

const parameters = {
  customerID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'customerId',
    description: 'The ID of the customer.',
  }),
};

// #region Sync Tables
export const Sync_Customers = coda.makeSyncTable({
  name: 'Customers',
  description: 'Return Customers from this shop.',
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
      sharedParameters.optionalSyncMetafields,
      {
        ...sharedParameters.filterCreatedAtRange,
        optional: true,
        description: 'Sync only customers created in the given date range.',
      },
      {
        ...sharedParameters.filterUpdatedAtRange,
        optional: true,
        description: 'Sync only customers updated in the given date range.',
      },
      { ...sharedParameters.filterIds, optional: true },
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

      let restItems = [];
      let restContinuation: SyncTableRestContinuation = null;
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
        } as CustomerSyncRestParams);

        let url: string;
        if (prevContinuation?.nextUrl) {
          url = coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit });
        } else {
          url = coda.withQueryParams(
            `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/customers.json`,
            restParams
          );
        }
        const { response, continuation } = await makeSyncTableGetRequest({ url }, context);
        restContinuation = continuation;

        if (response?.body?.customers) {
          restItems = response.body.customers.map((customer) => formatCustomerForSchemaFromRestApi(customer, context));
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
      const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
      const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
      const metafieldDefinitions = hasUpdatedMetaFields
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Customer }, context)
        : [];

      const jobs = updates.map((update) => handleCustomerUpdateJob(update, metafieldDefinitions, context));
      const completed = await Promise.allSettled(jobs);
      return {
        result: completed.map((job) => {
          if (job.status === 'fulfilled') return job.value;
          else return job.reason;
        }),
      };
    },
  },
});
// #endregion

// #region Actions
export const Action_CreateCustomer = coda.makeFormula({
  name: 'CreateCustomer',
  description: `Create a new Shopify customer and return customer ID.\nCustomer must have a name, phone number or email address.`,
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    // optional parameters
    { ...sharedParameters.inputFirstName, description: "The customer's first name.", optional: true },
    { ...sharedParameters.inputLastName, description: "The customer's last name.", optional: true },
    {
      ...sharedParameters.inputEmail,
      description:
        'The unique email address of the customer. Attempting to assign the same email address to multiple customers returns an error.',
      optional: true,
    },
    {
      ...sharedParameters.inputPhone,
      description:
        'The unique phone number (E.164 format) for this customer.\nAttempting to assign the same phone number to multiple customers returns an error.',
      optional: true,
    },
    {
      ...sharedParameters.inputNote,
      description: 'A note about the customer.',
      optional: true,
    },
    { ...sharedParameters.inputTags, optional: true },
    { ...sharedParameters.inputAcceptsEmailMarketing, optional: true },
    { ...sharedParameters.inputAcceptsSmsMarketing, optional: true },
    { ...sharedParameters.metafields, optional: true, description: 'Customer metafields to create.' },
  ],
  isAction: true,
  resultType: coda.ValueType.String,
  execute: async function (
    [firstName, lastName, email, phone, note, tags, acceptsEmailMarketing, acceptsSmsMarketing, metafields],
    context
  ) {
    if (!firstName && !lastName && !email && !phone) {
      throw new coda.UserVisibleError('Customer must have a name, phone number or email address.');
    }

    const restParams: CustomerCreateRestParams = {
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
      note,
      tags: tags ? tags.join(',') : undefined,
    };
    if (acceptsEmailMarketing !== undefined) {
      restParams.email_marketing_consent = {
        state: acceptsEmailMarketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };
    }
    if (acceptsSmsMarketing !== undefined) {
      restParams.sms_marketing_consent = {
        state: acceptsSmsMarketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };
    }

    if (metafields && metafields.length) {
      const parsedMetafieldKeyValueSets: CodaMetafieldKeyValueSet[] = metafields.map((m) => JSON.parse(m));
      const metafieldRestInputs = parsedMetafieldKeyValueSets
        .map(formatMetafieldRestInputFromMetafieldKeyValueSet)
        .filter((m) => m);
      if (metafieldRestInputs.length) {
        restParams.metafields = metafieldRestInputs;
      }
    }

    const response = await createCustomerRest(restParams, context);
    return response.body.customer.id;
  },
});

export const Action_UpdateCustomer = coda.makeFormula({
  name: 'UpdateCustomer',
  description: 'Update an existing Shopify customer and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    parameters.customerID,

    // optional parameters
    { ...sharedParameters.inputFirstName, description: "The customer's first name.", optional: true },
    { ...sharedParameters.inputLastName, description: "The customer's last name.", optional: true },
    {
      ...sharedParameters.inputEmail,
      description:
        'The unique email address of the customer. Attempting to assign the same email address to multiple customers returns an error.',
      optional: true,
    },
    {
      ...sharedParameters.inputPhone,
      description:
        'The unique phone number (E.164 format) for this customer.\nAttempting to assign the same phone number to multiple customers returns an error.',
      optional: true,
    },
    {
      ...sharedParameters.inputNote,
      description: 'A note about the customer.',
      optional: true,
    },
    { ...sharedParameters.inputTags, optional: true },
    { ...sharedParameters.inputAcceptsEmailMarketing, optional: true },
    { ...sharedParameters.inputAcceptsSmsMarketing, optional: true },
    { ...sharedParameters.metafields, optional: true, description: 'Customer metafields to update.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(CustomerSchema, IDENTITY_CUSTOMER),
  schema: CustomerSyncTableSchema,
  execute: async function (
    [customerId, firstName, lastName, email, phone, note, tags, acceptsEmailMarketing, acceptsSmsMarketing, metafields],
    context
  ) {
    const restParams: CustomerUpdateRestParams = {
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
      tags: tags ? tags.join(',') : undefined,
      note,
    };
    if (acceptsEmailMarketing !== undefined) {
      restParams.email_marketing_consent = {
        state: acceptsEmailMarketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };
    }
    if (acceptsSmsMarketing !== undefined) {
      restParams.sms_marketing_consent = {
        state: acceptsSmsMarketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };
    }
    // Disabled for now, prefer to use simple checkboxes
    /*
    else if (fromKey === 'email_marketing_consent') {
      const matchingOption = MARKETING_CONSENT_UPDATE_OPTIONS.find((option) => option.display === value);
      restParams.email_marketing_consent = {
        state: matchingOption.state,
        opt_in_level: matchingOption.opt_in_level,
      };
    } else if (fromKey === 'sms_marketing_consent') {
      const matchingOption = MARKETING_CONSENT_UPDATE_OPTIONS.find((option) => option.display === value);
      restParams.sms_marketing_consent = {
        state: matchingOption.state,
        opt_in_level: matchingOption.opt_in_level,
      };
    }
    */

    const promises = [];
    promises.push(updateCustomerRest(customerId, restParams, context));
    if (metafields && metafields.length) {
      promises.push(
        updateAndFormatResourceMetafieldsGraphQl(
          {
            ownerGid: idToGraphQlGid(GraphQlResource.Customer, customerId),
            metafieldKeyValueSets: metafields.map((s) => JSON.parse(s)),
            schemaWithIdentity: false,
          },
          context
        )
      );
    } else {
      promises.push(undefined);
    }

    const [restResponse, updatedFormattedMetafields] = await Promise.all(promises);
    const obj = {
      id: customerId,
      ...(restResponse?.body?.customer ? formatCustomerForSchemaFromRestApi(restResponse.body.customer, context) : {}),
      ...(updatedFormattedMetafields ?? {}),
    };

    return obj;
  },
});

export const Action_DeleteCustomer = coda.makeFormula({
  name: 'DeleteCustomer',
  description: 'Delete an existing Shopify customer and return true on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.customerID],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([customerId], context) {
    await deleteCustomer(customerId, context);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Customer = coda.makeFormula({
  name: 'Customer',
  description: 'Return a single customer from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.customerID],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: CustomerSyncTableSchema,
  execute: async ([customer_id], context) => {
    const customerResponse = await fetchSingleCustomerRest(customer_id, context);
    if (customerResponse.body?.customer) {
      return formatCustomerForSchemaFromRestApi(customerResponse.body.customer, context);
    }
  },
});

export const Format_Customer: coda.Format = {
  name: 'Customer',
  instructions: 'Paste the customer ID into the column.',
  formulaName: 'Customer',
};
// #endregion
