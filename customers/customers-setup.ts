import * as coda from '@codahq/packs-sdk';

import {
  deleteCustomer,
  createCustomerRest,
  formatCustomerForSchemaFromRestApi,
  handleCustomerUpdateJob,
  fetchCustomerRest,
  codaCustomerValuesToRest,
} from './customers-functions';

import { CustomerSchema, customerFieldDependencies } from './customers-schema';
import { sharedParameters } from '../shared-parameters';
import {
  CACHE_MINUTE,
  IDENTITY_CUSTOMER,
  METAFIELD_PREFIX_KEY,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import { augmentSchemaWithMetafields } from '../metafields/metafields-schema';
import { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';
import {
  fetchMetafieldDefinitions,
  findMatchingMetafieldDefinition,
  formatMetafieldsForSchema,
  getMetaFieldRealFromKey,
  separatePrefixedMetafieldsKeysFromKeys,
  splitMetaFieldFullKey,
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
import {
  GetCustomersMetafieldsQuery,
  GetCustomersMetafieldsQueryVariables,
  MetafieldDefinitionFragment,
} from '../types/admin.generated';
import {
  UpdateCreateProp,
  getMetafieldsCreateUpdateProps,
  getVarargsMetafieldDefinitionsAndUpdateCreateProps,
  parseVarargsCreateUpdatePropsValues,
} from '../helpers-varargs';
import { MetafieldRestInput } from '../types/Metafields';
import { CustomerCreateRestParams } from '../types/Customer';

async function getCustomerSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = CustomerSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(CustomerSchema, 'CUSTOMER', context);
  }
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

/**
 * The properties that can be updated when updating a customer.
 */
const standardUpdateProps: UpdateCreateProp[] = [
  { display: 'first name', key: 'first_name', type: 'string' },
  { display: 'last name', key: 'last_name', type: 'string' },
  { display: 'email', key: 'email', type: 'string' },
  { display: 'phone', key: 'phone', type: 'string' },
  { display: 'note', key: 'note', type: 'string' },
  { display: 'tags', key: 'tags', type: 'string' },
  { display: 'accepts Email marketing', key: 'accepts_email_marketing', type: 'boolean' },
  { display: 'accepts SMS marketing', key: 'accepts_sms_marketing', type: 'boolean' },
];
/**
 * The properties that can be updated when creating a customer.
 */
const standardCreateProps = standardUpdateProps;

const parameters = {
  customerID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'customerId',
    description: 'The ID of the customer.',
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
  // #region Sync Tables
  pack.addSyncTable({
    name: 'Customers',
    description: 'Return Customers from this shop.',
    identityName: IDENTITY_CUSTOMER,
    schema: CustomerSchema,
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
        const schema =
          context.sync.schema ?? (await wrapGetSchemaForCli(getCustomerSchema, context, { syncMetafields }));
        const prevContinuation = context.sync.continuation as SyncTableMixedContinuation;
        const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
        const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
          separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

        const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(getMetaFieldRealFromKey);
        const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

        let restLimit = REST_DEFAULT_LIMIT;
        let maxEntriesPerRun = restLimit;
        let shouldDeferBy = 0;
        let metafieldDefinitions: MetafieldDefinitionFragment[] = [];

        if (shouldSyncMetafields) {
          // TODO: calc this
          const defaultMaxEntriesPerRun = 200;
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

          metafieldDefinitions =
            prevContinuation?.extraContinuationData?.metafieldDefinitions ??
            (await fetchMetafieldDefinitions('CUSTOMER', context));
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
            ids,
            created_at_min: created_at ? created_at[0] : undefined,
            created_at_max: created_at ? created_at[1] : undefined,
            updated_at_min: updated_at ? updated_at[0] : undefined,
            updated_at_max: updated_at ? updated_at[1] : undefined,
          });

          // TODO: validateCustomerParams
          // validateCustomerParams(restParams);

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

          if (response && response.body?.customers) {
            restItems = response.body.customers.map((customer) =>
              formatCustomerForSchemaFromRestApi(customer, context)
            );
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
                  metafieldDefinitions,
                  currentBatch: {
                    remaining: remaining,
                    processing: toProcess,
                  },
                },
                getPageInfo: (data: GetCustomersMetafieldsQuery) => data.customers?.pageInfo,
              },
              context
            );

          if (augmentedResponse && augmentedResponse.body?.data) {
            const customersData = augmentedResponse.body.data as GetCustomersMetafieldsQuery;
            const augmentedItems = toProcess
              .map((customer) => {
                const graphQlNodeMatch = customersData.customers.nodes.find(
                  (c) => graphQlGidToId(c.id) === customer.id
                );

                // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
                if (!graphQlNodeMatch) return;

                if (graphQlNodeMatch?.metafields?.nodes?.length) {
                  return {
                    ...customer,
                    ...formatMetafieldsForSchema(graphQlNodeMatch.metafields.nodes, metafieldDefinitions),
                  };
                }
                return customer;
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
        const metafieldDefinitions = hasUpdatedMetaFields ? await fetchMetafieldDefinitions('CUSTOMER', context) : [];

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
  // an action to update a customer
  pack.addFormula({
    name: 'UpdateCustomer',
    description: 'Update an existing Shopify customer and return the updated data.',
    parameters: [parameters.customerID],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The customer property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions('CUSTOMER', context, CACHE_MINUTE);
          const searchObjs = standardUpdateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          return coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    schema: coda.withIdentity(CustomerSchema, IDENTITY_CUSTOMER),
    execute: async function ([customer_id, ...varargs], context) {
      // Build a Coda update object for Rest Admin and GraphQL API updates
      let update: coda.SyncUpdate<string, string, any>;

      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, 'CUSTOMER', context);
      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardUpdateProps, metafieldUpdateCreateProps);

      update = {
        previousValue: { id: customer_id },
        newValue: newValues,
        updatedFields: Object.keys(newValues),
      };
      update.newValue = cleanQueryParams(update.newValue);

      return handleCustomerUpdateJob(update, metafieldDefinitions, context);
    },
  });

  // an action to create a customer
  pack.addFormula({
    name: 'CreateCustomer',
    description: `Create a new Shopify customer and return customer ID.\nCustomer must have a name, phone number or email address.`,
    parameters: [],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The customer property to create.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions('CUSTOMER', context, CACHE_MINUTE);
          const searchObjs = standardCreateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          return coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async function ([...varargs], context) {
      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, 'CUSTOMER', context);

      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardCreateProps, metafieldUpdateCreateProps);
      const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(
        Object.keys(newValues)
      );

      if (!newValues['first_name'] && !newValues['last_name'] && !newValues['email'] && !newValues['phone']) {
        throw new coda.UserVisibleError('Customer must have a name, phone number or email address.');
      }

      // We can use Rest Admin API to create metafields
      let metafieldRestInputs: MetafieldRestInput[] = [];
      prefixedMetafieldFromKeys.forEach((fromKey) => {
        const realFromKey = getMetaFieldRealFromKey(fromKey);
        const { metaKey, metaNamespace } = splitMetaFieldFullKey(realFromKey);
        const matchingMetafieldDefinition = findMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);
        const input: MetafieldRestInput = {
          namespace: metaNamespace,
          key: metaKey,
          value: newValues[fromKey],
          type: matchingMetafieldDefinition?.type.name,
        };
        metafieldRestInputs.push(input);
      });

      const params: CustomerCreateRestParams = {
        metafields: metafieldRestInputs.length ? metafieldRestInputs : undefined,
      };
      standardFromKeys.forEach((key) => (params[key] = newValues[key]));

      const response = await createCustomerRest(codaCustomerValuesToRest(params), context);
      return response.body.customer.id;
    },
  });

  // an action to delete a customer
  pack.addFormula({
    name: 'DeleteCustomer',
    description: 'Delete an existing Shopify customer and return true on success.',
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
  pack.addFormula({
    name: 'Customer',
    description: 'Return a single customer from this shop.',
    parameters: [parameters.customerID],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: CustomerSchema,
    execute: async ([customer_id], context) => {
      const customerResponse = await fetchCustomerRest(customer_id, context);
      if (customerResponse.body?.customer) {
        return formatCustomerForSchemaFromRestApi(customerResponse.body.customer, context);
      }
    },
  });

  pack.addColumnFormat({
    name: 'Customer',
    instructions: 'Paste the the customer Id into the column.',
    formulaName: 'Customer',
  });
  // #endregion
};
