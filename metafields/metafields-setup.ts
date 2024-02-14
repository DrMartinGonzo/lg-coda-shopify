// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  createResourceMetafieldRest,
  deleteMetafieldRest,
  updateResourceMetafieldRest,
  splitMetaFieldFullKey,
  updateMetafieldsGraphQl,
  getResourceMetafieldsSyncTableDefinition,
  formatMetafieldForSchemaFromGraphQlApi,
} from './metafields-functions';

import { MetafieldSchema } from '../schemas/syncTable/MetafieldSchema';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  idToGraphQlGid,
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';

import { createHash } from 'node:crypto';
import { METAFIELDS_RESOURCE_TYPES, RESOURCE_COLLECTION, RESOURCE_SHOP } from '../constants';
import { MetafieldOwnerType } from '../types/Metafields';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import { MetafieldFieldsFragment, makeQueryMetafieldsByKeys } from './metafields-graphql';
import { ProductReference } from '../schemas/syncTable/ProductSchemaRest';
import { CollectionReference } from '../schemas/syncTable/CollectionSchema';
import { BlogReference } from '../schemas/syncTable/BlogSchema';
import { CustomerReference } from '../schemas/syncTable/CustomerSchema';
import { LocationReference } from '../schemas/syncTable/LocationSchema';
import { OrderReference } from '../schemas/syncTable/OrderSchema';
import { PageReference } from '../schemas/syncTable/PageSchema';
import { ProductVariantReference } from '../schemas/syncTable/ProductVariantSchema';
import { ArticleReference } from '../schemas/syncTable/ArticleSchema';

import { MetafieldsSetInput } from '../types/admin.types';
import { RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS } from './metafields-constants';

// #endregion

async function getMetafieldSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = MetafieldSchema;

  // Augment schema with a relation to the owner of the metafield
  const resourceMetafieldsSyncTableDefinition = getResourceMetafieldsSyncTableDefinition(context.sync.dynamicUrl);
  let ownerReference: coda.GenericObjectSchema & coda.ObjectSchemaProperty;
  switch (resourceMetafieldsSyncTableDefinition.metafieldOwnerType) {
    case MetafieldOwnerType.Article:
      ownerReference = ArticleReference;
      break;
    case MetafieldOwnerType.Blog:
      ownerReference = BlogReference;
      break;
    case MetafieldOwnerType.Collection:
      ownerReference = CollectionReference;
      break;
    case MetafieldOwnerType.Customer:
      ownerReference = CustomerReference;
      break;
    case MetafieldOwnerType.Location:
      ownerReference = LocationReference;
      break;
    case MetafieldOwnerType.Order:
      ownerReference = OrderReference;
      break;
    case MetafieldOwnerType.Page:
      ownerReference = PageReference;
      break;
    case MetafieldOwnerType.Product:
      ownerReference = ProductReference;
      break;
    case MetafieldOwnerType.Productvariant:
      ownerReference = ProductVariantReference;
      break;

    default:
      break;
  }
  if (ownerReference) {
    augmentedSchema.properties['owner'] = {
      ...ownerReference,
      fromKey: 'owner',
      fixedId: 'owner',
      required: true,
      description: 'A relation to the owner of this metafield.',
    };
    augmentedSchema.featuredProperties.push('owner');
  }

  // admin_url should always be the last featured property
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

const parameters = {
  metafieldID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'metafieldId',
    description: 'The ID of the metafield.',
  }),
  ownerID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'ownerId',
    description: 'The ID of the resource owning the metafield.',
  }),
  optionalOwnerID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'ownerId',
    description: 'The ID of the resource owning the metafield. Not needed if requesting Shop metafields.',
    optional: true,
  }),
  ownerType: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'ownerType',
    description: 'The type of the resource owning the metafield.',
    autocomplete: RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS.map((v) => ({
      display: v.display,
      value: v.key,
    })),
  }),
  namespace: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'namespace',
    description: 'The namespace of the metafield.',
  }),
  key: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'key',
    description: 'The key of the metafield.',
  }),
  fullKey: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fullKey',
    description:
      'The full key of the metafield. That is, the key prefixed with the namespace and separated by a dot. e.g. "namespace.key".',
  }),
};

export const setupMetafields = (pack: coda.PackDefinitionBuilder) => {
  // #region Sync tables
  pack.addDynamicSyncTable({
    name: 'Metafields',
    description: 'All Shopify metafields',
    identityName: 'Metafield',
    listDynamicUrls: async function (context, docUrl: String) {
      return RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS.map((v) => ({
        display: v.display,
        value: v.key,
        hasChildren: false,
      }));
    },
    getName: async function (context) {
      const resourceMetafieldsSyncTableDefinition = getResourceMetafieldsSyncTableDefinition(context.sync.dynamicUrl);
      return `${resourceMetafieldsSyncTableDefinition.display} metafields`;
    },
    getDisplayUrl: async function (context) {
      const resourceMetafieldsSyncTableDefinition = getResourceMetafieldsSyncTableDefinition(context.sync.dynamicUrl);
      return `${context.endpoint}/admin/settings/custom_data/${resourceMetafieldsSyncTableDefinition.metafieldsSettingsUrlPart}/metafields`;
    },
    getSchema: getMetafieldSchema,
    defaultAddDynamicColumns: false,
    formula: {
      name: 'SyncMetafields',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.StringArray,
          name: 'metafieldKeys',
          description: 'Metafield key to sync. In the format of <namespace.key>. For example: `coda.title`.',
        }),
      ],
      execute: async function ([metafieldKeys], context) {
        const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
        // TODO: get an approximation for first run by using count of relation columns ?
        const defaultMaxEntriesPerRun = 50;
        const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
          defaultMaxEntriesPerRun,
          prevContinuation,
          context
        );
        if (shouldDeferBy > 0) {
          return skipGraphQlSyncTableRun(prevContinuation as unknown as SyncTableGraphQlContinuation, shouldDeferBy);
        }

        // const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
        const resourceType = context.sync.dynamicUrl;
        const resourceMetafieldsSyncTableDefinition = getResourceMetafieldsSyncTableDefinition(resourceType);
        const { syncTableGraphQlQueryOperation: graphQlQueryOperation } = resourceMetafieldsSyncTableDefinition;

        const query = `
          ${MetafieldFieldsFragment}

          query query${resourceType}Metafields($metafieldKeys: [String!], $maxEntriesPerRun: Int!, $countMetafields: Int!, $cursor: String){
            ${graphQlQueryOperation}(first: $maxEntriesPerRun, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                metafields(keys: $metafieldKeys, first: $countMetafields) {
                  nodes {
                    ...MetafieldFields
                    definition {
                      id
                    }
                  }
                }
              }
            }
          }
        `;

        const payload = {
          query: query,
          variables: {
            metafieldKeys,
            maxEntriesPerRun,
            countMetafields: metafieldKeys.length,
            cursor: prevContinuation?.cursor ?? null,
          },
        };

        const { response, continuation } = await makeSyncTableGraphQlRequest(
          {
            payload,
            maxEntriesPerRun,
            prevContinuation,
            getPageInfo: (data: any) => data[graphQlQueryOperation]?.pageInfo,
          },
          context
        );

        const items = response.body.data[graphQlQueryOperation].nodes
          .map((ownerNode) =>
            ownerNode.metafields.nodes.map((metafieldNode: any) =>
              formatMetafieldForSchemaFromGraphQlApi(
                metafieldNode,
                ownerNode.id,
                resourceMetafieldsSyncTableDefinition,
                context
              )
            )
          )
          .flat()
          .filter((m) => m);

        return {
          result: items,
          continuation: continuation,
        };
      },
      maxUpdateBatchSize: 10,
      executeUpdate: async function (params, updates, context) {
        // const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
        // const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
        // const metafieldDefinitions = hasUpdatedMetaFields
        //   ? await fetchMetafieldDefinitions(MetafieldOwnerType.Product, context)
        //   : [];

        const resourceMetafieldsSyncTableDefinition = getResourceMetafieldsSyncTableDefinition(context.sync.dynamicUrl);

        const jobs = updates.map(async (update) => {
          const { updatedFields } = update;
          let value = update.newValue.rawValue as string;
          if (updatedFields.includes('editCollectionReferenceList')) {
            // value = JSON.stringify(update.newValue.rawValue);
            value = JSON.stringify(
              (update.newValue.editCollectionReferenceList as any[]).map((v) =>
                idToGraphQlGid(RESOURCE_COLLECTION, v?.id)
              )
            );
          }

          const { metaKey, metaNamespace } = splitMetaFieldFullKey(update.previousValue.label as string);
          const ownerNodeId = idToGraphQlGid(
            resourceMetafieldsSyncTableDefinition.key,
            update.previousValue.owner_id as number
          );
          const metafieldsSetInputs: MetafieldsSetInput[] = [
            {
              key: metaKey,
              namespace: metaNamespace,
              ownerId: ownerNodeId,
              type: update.previousValue.type as string,
              // value: update.newValue.rawValue as string,
              value: value,
            },
          ];
          console.log('metafieldsSetInputs', metafieldsSetInputs);

          const { response } = await updateMetafieldsGraphQl(metafieldsSetInputs, context);
          console.log('response', response);

          return formatMetafieldForSchemaFromGraphQlApi(
            response.body.data.metafieldsSet.metafields[0],
            ownerNodeId,
            resourceMetafieldsSyncTableDefinition,
            context
          );
        });
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

  // #region Formulas
  // Metafield formula
  pack.addFormula({
    name: 'Metafield',
    description: 'Get a single metafield by its fullkey.',
    parameters: [parameters.ownerType, parameters.fullKey, parameters.optionalOwnerID],
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Object,
    schema: MetafieldSchema,
    execute: async function ([ownerType, fullKey, ownerId], context) {
      if (ownerType !== RESOURCE_SHOP && ownerId === undefined) {
        throw new coda.UserVisibleError(
          `The ownerID parameter is required when requesting metafields from resources other than Shop.`
        );
      }

      // This also validates resourceType
      const resourceMetafieldsSyncTableDefinition = getResourceMetafieldsSyncTableDefinition(ownerType);
      const { graphQlQueryOperation } = resourceMetafieldsSyncTableDefinition;
      const payload = {
        query: makeQueryMetafieldsByKeys(graphQlQueryOperation),
        variables: {
          ownerGid: ownerId ? idToGraphQlGid(resourceMetafieldsSyncTableDefinition.key, ownerId) : undefined,
          metafieldKeys: [fullKey],
          countMetafields: 1,
        },
      };

      const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: 0 }, context);

      if (response?.body?.data[graphQlQueryOperation]?.metafields) {
        // When querying metafields via their keys, GraphQl returns the 'full' key, i.e. `${namespace}.${key}`.
        const metafieldNode = response.body.data[graphQlQueryOperation].metafields.nodes.find((m) => m.key === fullKey);
        if (metafieldNode) {
          return formatMetafieldForSchemaFromGraphQlApi(
            metafieldNode,
            response.body.data[graphQlQueryOperation].id,
            resourceMetafieldsSyncTableDefinition,
            context,
            false
          );
        }
      }
    },
  });

  // Metafields formula
  pack.addFormula({
    name: 'Metafields',
    description: 'Get all metafields from a specific resource.',
    parameters: [parameters.ownerType, parameters.optionalOwnerID],
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Array,
    items: MetafieldSchema,
    execute: async function ([ownerType, ownerId], context) {
      if (ownerType !== RESOURCE_SHOP && ownerId === undefined) {
        throw new coda.UserVisibleError(
          `The ownerID parameter is required when requesting metafields from resources other than Shop.`
        );
      }

      // This also validates resourceType
      const resourceMetafieldsSyncTableDefinition = getResourceMetafieldsSyncTableDefinition(ownerType);
      const { graphQlQueryOperation } = resourceMetafieldsSyncTableDefinition;
      const payload = {
        query: makeQueryMetafieldsByKeys(graphQlQueryOperation),
        variables: {
          ownerGid: ownerId ? idToGraphQlGid(resourceMetafieldsSyncTableDefinition.key, ownerId) : undefined,
          metafieldKeys: [],
          countMetafields: 250,
        },
      };

      const { response } = await makeGraphQlRequest({ payload, cacheTtlSecs: 0 }, context);

      if (response?.body?.data[graphQlQueryOperation]?.metafields) {
        return response.body.data[graphQlQueryOperation].metafields.nodes.map((metafieldNode: any) =>
          formatMetafieldForSchemaFromGraphQlApi(
            metafieldNode,
            response.body.data[graphQlQueryOperation].id,
            resourceMetafieldsSyncTableDefinition,
            context
          )
        );
      }
    },
  });
  // #endregion

  // #region Actions
  // CreateMetafield action
  pack.addFormula({
    name: 'CreateMetafield',
    description: 'create resource metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'resourceId',
        description: 'The id of the resource.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'resourceType',
        description: 'The type of resource.',
        autocomplete: METAFIELDS_RESOURCE_TYPES,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'namespace',
        description: 'The namespace of the metafield.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The key of the metafield.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'The value of the metafield.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'type',
        description: 'The value type of the metafield.',
        optional: true,
      }),
    ],
    isAction: true,
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Number,
    execute: async ([resourceId, resourceType, namespace, key, value, type], context) => {
      const response = await createResourceMetafieldRest(
        [resourceId, resourceType, namespace, key, value, type],
        context
      );
      const { body } = response;
      return body.metafield.id;
    },
  });

  // UpdateMetafield action
  pack.addFormula({
    name: 'UpdateMetafield',
    description: 'update resource metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'resourceId',
        description: 'The id of the resource.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'resourceType',
        description: 'The type of resource.',
        autocomplete: METAFIELDS_RESOURCE_TYPES,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'The value of the metafield.',
      }),
    ],
    isAction: true,
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Boolean,
    execute: async ([metafieldId, resourceId, resourceType, value], context) => {
      const response = await updateResourceMetafieldRest([metafieldId, resourceId, resourceType, value], context);
      return true;
    },
  });

  // DeleteMetafield action
  pack.addFormula({
    name: 'DeleteMetafield',
    description: 'delete metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
    ],
    isAction: true,
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Boolean,
    execute: async ([metafieldId], context) => {
      const response = await deleteMetafieldRest(metafieldId, context);
      return true;
    },
  });
  // #endregion
};
