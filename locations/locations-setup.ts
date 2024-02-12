import * as coda from '@codahq/packs-sdk';

import { formatLocationForSchemaFromRestApi, handleLocationUpdateJob, fetchLocationRest } from './locations-functions';

import { LocationSchema, locationFieldDependencies } from '../schemas/syncTable/LocationSchema';
import { sharedParameters } from '../shared-parameters';
import { IDENTITY_LOCATION, METAFIELD_PREFIX_KEY, REST_DEFAULT_API_VERSION, REST_DEFAULT_LIMIT } from '../constants';
import { augmentSchemaWithMetafields } from '../metafields/metafields-functions';
import { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';
import {
  fetchMetafieldDefinitions,
  formatMetafieldsForSchema,
  getMetaFieldRealFromKey,
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
import { QueryLocationsMetafieldsAdmin, buildLocationsSearchQuery } from './locations-graphql';
import {
  GetLocationsMetafieldsQuery,
  GetLocationsMetafieldsQueryVariables,
  MetafieldDefinitionFragment,
} from '../types/admin.generated';
import { UpdateCreateProp } from '../helpers-varargs';
import { MetafieldOwnerType } from '../types/Metafields';

async function getLocationSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = LocationSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(LocationSchema, MetafieldOwnerType.Location, context);
  }
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

// TODO: on peut update les locations mais seulement via GraphQL

/**
 * The properties that can be updated when updating a location.
 */
const standardUpdateProps: UpdateCreateProp[] = [];
/**
 * The properties that can be updated when creating a location.
 */
const standardCreateProps = standardUpdateProps;

const parameters = {
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

export const setupLocations = (pack: coda.PackDefinitionBuilder) => {
  // #region Sync Tables
  pack.addSyncTable({
    name: 'Locations',
    description: 'Return Locations from this shop.',
    identityName: IDENTITY_LOCATION,
    schema: LocationSchema,
    dynamicOptions: {
      getSchema: getLocationSchema,
      defaultAddDynamicColumns: false,
    },
    formula: {
      name: 'SyncLocations',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [sharedParameters.optionalSyncMetafields],
      execute: async function ([syncMetafields], context: coda.SyncExecutionContext) {
        // If executing from CLI, schema is undefined, we have to retrieve it first
        const schema =
          context.sync.schema ?? (await wrapGetSchemaForCli(getLocationSchema, context, { syncMetafields }));
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
            (await fetchMetafieldDefinitions(MetafieldOwnerType.Location, context));
        }

        let restItems = [];
        let restContinuation: SyncTableRestContinuation = null;
        const skipNextRestSync = prevContinuation?.extraContinuationData?.skipNextRestSync ?? false;

        // Rest Admin API Sync
        if (!skipNextRestSync) {
          const syncedStandardFields = handleFieldDependencies(standardFromKeys, locationFieldDependencies);
          const restParams = cleanQueryParams({
            fields: syncedStandardFields.join(', '),
            limit: restLimit,
            // ids,
            // created_at_min: created_at ? created_at[0] : undefined,
            // created_at_max: created_at ? created_at[1] : undefined,
            // updated_at_min: updated_at ? updated_at[0] : undefined,
            // updated_at_max: updated_at ? updated_at[1] : undefined,
          });

          // TODO: validateLocationParams
          // validateLocationParams(restParams);

          let url: string;
          if (prevContinuation?.nextUrl) {
            url = coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit });
          } else {
            url = coda.withQueryParams(
              `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/locations.json`,
              restParams
            );
          }
          const { response, continuation } = await makeSyncTableGetRequest({ url }, context);
          restContinuation = continuation;

          if (response && response.body?.locations) {
            restItems = response.body.locations.map((location) =>
              formatLocationForSchemaFromRestApi(location, context)
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
            query: QueryLocationsMetafieldsAdmin,
            variables: {
              maxEntriesPerRun,
              metafieldKeys: effectiveMetafieldKeys,
              countMetafields: effectiveMetafieldKeys.length,
              cursor: prevContinuation?.cursor,
              searchQuery: buildLocationsSearchQuery({ ids: uniqueIdsToFetch }),
            } as GetLocationsMetafieldsQueryVariables,
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
                getPageInfo: (data: GetLocationsMetafieldsQuery) => data.locations?.pageInfo,
              },
              context
            );

          if (augmentedResponse && augmentedResponse.body?.data) {
            const locationsData = augmentedResponse.body.data as GetLocationsMetafieldsQuery;
            const augmentedItems = toProcess
              .map((location) => {
                const graphQlNodeMatch = locationsData.locations.nodes.find(
                  (c) => graphQlGidToId(c.id) === location.id
                );

                // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
                if (!graphQlNodeMatch) return;

                if (graphQlNodeMatch?.metafields?.nodes?.length) {
                  return {
                    ...location,
                    ...formatMetafieldsForSchema(graphQlNodeMatch.metafields.nodes, metafieldDefinitions),
                  };
                }
                return location;
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
          ? await fetchMetafieldDefinitions(MetafieldOwnerType.Location, context)
          : [];

        const jobs = updates.map((update) => handleLocationUpdateJob(update, metafieldDefinitions, context));
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

  /*
  // #region Actions
  // an action to update a customer
  pack.addFormula({
    name: 'UpdateCustomer',
    description: 'Update an existing Shopify customer and return the updated data.',
    parameters: [parameters.locationID],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The customer property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions(
            MetafieldOwnerType.Customer,
            context,
            CACHE_MINUTE
          );
          const searchObjs = standardUpdateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
          return result.sort(compareByDisplayKey);
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    schema: coda.withIdentity(LocationSchema, IDENTITY_CUSTOMER),
    execute: async function ([customer_id, ...varargs], context) {
      // Build a Coda update object for Rest Admin and GraphQL API updates
      let update: coda.SyncUpdate<string, string, any>;

      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Customer, context);
      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardUpdateProps, metafieldUpdateCreateProps);

      update = {
        previousValue: { id: customer_id },
        newValue: newValues,
        updatedFields: Object.keys(newValues),
      };
      // TODO: should not be needed here if each Rest update function implement this cleaning
      update.newValue = cleanQueryParams(update.newValue);

      return handleLocationUpdateJob(update, metafieldDefinitions, context);
    },
  });
  // #endregion
*/

  // #region Formulas
  pack.addFormula({
    name: 'Location',
    description: 'Return a single location from this shop.',
    parameters: [sharedParameters.locationID],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: LocationSchema,
    execute: async ([location_id], context) => {
      const locationResponse = await fetchLocationRest(location_id, context);
      if (locationResponse.body?.location) {
        return formatLocationForSchemaFromRestApi(locationResponse.body.location, context);
      }
    },
  });

  pack.addColumnFormat({
    name: 'Location',
    instructions: 'Paste the location Id into the column.',
    formulaName: 'Location',
  });
  // #endregion
};
