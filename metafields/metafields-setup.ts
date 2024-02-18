// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  createResourceMetafieldRest,
  deleteMetafieldRest,
  updateResourceMetafieldRest,
  splitMetaFieldFullKey,
  updateMetafieldsGraphQl,
  getValidResourceMetafieldsSyncTableDefinition,
  formatMetafieldForSchemaFromGraphQlApi,
  fetchSingleMetafieldGraphQl,
  fetchMetafieldsGraphQl,
  fetchSingleMetafieldRest,
  formatMetafieldValueForApi,
} from './metafields-functions';

import { MetafieldSchema, metafieldSyncTableHelperEditColumns } from '../schemas/syncTable/MetafieldSchema';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  idToGraphQlGid,
  makeGraphQlRequest,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';

import { createHash } from 'node:crypto';
import { METAFIELDS_RESOURCE_TYPES } from '../constants';
import { MetafieldFragmentWithDefinition, SupportedGraphQlResourceWithMetafields } from '../types/Metafields';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import { QueryShopMetafieldsByKeys, makeQueryResourceMetafieldsByKeys } from './metafields-graphql';
import { ProductReference } from '../schemas/syncTable/ProductSchemaRest';
import { CollectionReference } from '../schemas/syncTable/CollectionSchema';
import { BlogReference } from '../schemas/syncTable/BlogSchema';
import { CustomerReference } from '../schemas/syncTable/CustomerSchema';
import { LocationReference } from '../schemas/syncTable/LocationSchema';
import { OrderReference } from '../schemas/syncTable/OrderSchema';
import { PageReference } from '../schemas/syncTable/PageSchema';
import { ProductVariantReference } from '../schemas/syncTable/ProductVariantSchema';
import { ArticleReference } from '../schemas/syncTable/ArticleSchema';

import { MetafieldOwnerType, MetafieldsSetInput } from '../types/admin.types';
import { RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS } from './metafields-constants';
import { GraphQlResource } from '../types/GraphQl';
import type { Metafield as MetafieldRest } from '@shopify/shopify-api/rest/admin/2023-10/metafield';

// #endregion

// #region Helpers
async function getMetafieldSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = MetafieldSchema;
  const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;

  // Augment schema with a relation to the owner of the metafield
  const resourceMetafieldsSyncTableDefinition = getValidResourceMetafieldsSyncTableDefinition(graphQlResource);
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
// #endregion

// #region Sync tables
export const Sync_Metafields = coda.makeDynamicSyncTable({
  name: 'Metafields',
  description: 'All Shopify metafields',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: 'Metafield',
  listDynamicUrls: async function (context, docUrl: String) {
    return RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS.map((v) => ({
      display: v.display,
      value: v.key,
      hasChildren: false,
    }));
  },
  getName: async function (context) {
    const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
    const resourceMetafieldsSyncTableDefinition = getValidResourceMetafieldsSyncTableDefinition(graphQlResource);
    return `${resourceMetafieldsSyncTableDefinition.display} metafields`;
  },
  getDisplayUrl: async function (context) {
    const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
    const resourceMetafieldsSyncTableDefinition = getValidResourceMetafieldsSyncTableDefinition(graphQlResource);
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
      const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
      const isShopQuery = graphQlResource === GraphQlResource.Shop;
      const resourceMetafieldsSyncTableDefinition = getValidResourceMetafieldsSyncTableDefinition(graphQlResource);
      const { syncTableGraphQlQueryOperation: graphQlQueryOperation } = resourceMetafieldsSyncTableDefinition;

      const query = isShopQuery ? QueryShopMetafieldsByKeys : makeQueryResourceMetafieldsByKeys(graphQlQueryOperation);

      const payload = {
        query: query,
        variables: {
          metafieldKeys,
          countMetafields: metafieldKeys.length,
          maxEntriesPerRun,
          cursor: prevContinuation?.cursor ?? null,
        },
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: isShopQuery ? undefined : (data: any) => data[graphQlQueryOperation]?.pageInfo,
        },
        context
      );

      let items: any[];
      if (isShopQuery) {
        items = response.body.data[graphQlQueryOperation].metafields.nodes
          .map((metafieldNode: MetafieldFragmentWithDefinition) =>
            formatMetafieldForSchemaFromGraphQlApi(
              metafieldNode,
              response.body.data[graphQlQueryOperation].id,
              resourceMetafieldsSyncTableDefinition,
              context
            )
          )
          .filter((m) => m);
      } else {
        items = response.body.data[graphQlQueryOperation].nodes
          .map((ownerNode) =>
            ownerNode.metafields.nodes.map((metafieldNode: MetafieldFragmentWithDefinition) =>
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
      }

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

      const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
      const resourceMetafieldsSyncTableDefinition = getValidResourceMetafieldsSyncTableDefinition(graphQlResource);

      const jobs = updates.map(async (update) => {
        /** We need to get the current metafield first to know it's type
         * (user could have chosen not to sync the type column) and wether it still exists */
        let singleMetafield: MetafieldRest;
        try {
          const singleMetafieldResponse = await fetchSingleMetafieldRest(
            { metafieldId: update.previousValue.id as number, cacheTtlSecs: 0 },
            context
          );
          singleMetafield = singleMetafieldResponse?.body?.metafield;
          console.log('singleMetafield', singleMetafield);
        } catch (error) {
          if (error instanceof coda.UserVisibleError && error.message.indexOf('404') !== -1) {
            throw new coda.UserVisibleError(
              'Metafield not found. Maybe it has been deleted in Shopify since the last sync ?'
            );
          }
          // The request failed for some other reason. Re-throw the error so that it bubbles up.
          throw error;
        }

        const { type, owner_id } = singleMetafield;
        const { updatedFields } = update;

        let value = update.newValue.rawValue as string;
        metafieldSyncTableHelperEditColumns.forEach((item) => {
          if (updatedFields.includes(item.key)) {
            if (type === item.type) {
              value = formatMetafieldValueForApi(update.newValue[item.key], type);
            } else {
              const goodColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === type);
              let errorMsg = `Metafield type mismatch. You tried to update using an helper column that doesn't match the metafield type.`;
              if (goodColumn) {
                errorMsg += ` The correct column for type '${type}' is: '${goodColumn.key}'.`;
              } else {
                errorMsg += ` You can only update this metafield by directly editing the 'Raw Value' column.`;
              }
              throw new coda.UserVisibleError(errorMsg);
            }
          }
        });

        const { metaKey, metaNamespace } = splitMetaFieldFullKey(update.previousValue.label as string);
        const ownerNodeId = idToGraphQlGid(
          resourceMetafieldsSyncTableDefinition.key,
          update.previousValue.owner_id as number
        );
        const metafieldsSetInputs: MetafieldsSetInput[] = [
          {
            key: metaKey,
            namespace: metaNamespace,
            ownerId: idToGraphQlGid(resourceMetafieldsSyncTableDefinition.key, owner_id),
            type,
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

// #region Actions
export const Action_CreateMetafield = coda.makeFormula({
  name: 'CreateMetafield',
  description: 'create resource metafield.',
  connectionRequirement: coda.ConnectionRequirement.Required,
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

export const Action_UpdateMetafield = coda.makeFormula({
  name: 'UpdateMetafield',
  description: 'update resource metafield.',
  connectionRequirement: coda.ConnectionRequirement.Required,
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

export const Action_DeleteMetafield = coda.makeFormula({
  name: 'DeleteMetafield',
  description: 'delete metafield.',
  connectionRequirement: coda.ConnectionRequirement.Required,
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

// #region Formulas
export const Formula_Metafield = coda.makeFormula({
  name: 'Metafield',
  description: 'Get a single metafield by its fullkey.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.ownerType, parameters.fullKey, parameters.optionalOwnerID],
  cacheTtlSecs: 0,
  resultType: coda.ValueType.Object,
  schema: MetafieldSchema,
  execute: async function ([ownerType, fullKey, ownerId], context) {
    const graphQlResource = ownerType as SupportedGraphQlResourceWithMetafields;
    const isShopQuery = graphQlResource === GraphQlResource.Shop;
    if (!isShopQuery && ownerId === undefined) {
      throw new coda.UserVisibleError(
        `The ownerID parameter is required when requesting metafields from resources other than Shop.`
      );
    }

    const resourceMetafieldsSyncTableDefinition = getValidResourceMetafieldsSyncTableDefinition(graphQlResource);
    const { metafieldNode, ownerNodeGid } = await fetchSingleMetafieldGraphQl(
      {
        graphQlResource,
        fullKey,
        ownerGid: ownerId ? idToGraphQlGid(graphQlResource, ownerId) : undefined,
        cacheTtlSecs: 0,
      },
      context
    );
    if (metafieldNode) {
      return formatMetafieldForSchemaFromGraphQlApi(
        metafieldNode,
        ownerNodeGid,
        resourceMetafieldsSyncTableDefinition,
        context,
        false
      );
    }
  },
});

export const Formula_Metafields = coda.makeFormula({
  name: 'Metafields',
  description: 'Get all metafields from a specific resource.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.ownerType, parameters.optionalOwnerID],
  cacheTtlSecs: 0,
  resultType: coda.ValueType.Array,
  items: MetafieldSchema,
  execute: async function ([ownerType, ownerId], context) {
    const graphQlResource = ownerType as SupportedGraphQlResourceWithMetafields;
    const isShopQuery = graphQlResource === GraphQlResource.Shop;
    if (!isShopQuery && ownerId === undefined) {
      throw new coda.UserVisibleError(
        `The ownerID parameter is required when requesting metafields from resources other than Shop.`
      );
    }

    const resourceMetafieldsSyncTableDefinition = getValidResourceMetafieldsSyncTableDefinition(graphQlResource);
    const { metafieldNodes, ownerNodeGid } = await fetchMetafieldsGraphQl(
      {
        graphQlResource,
        ownerGid: ownerId ? idToGraphQlGid(graphQlResource, ownerId) : undefined,
        cacheTtlSecs: 0,
      },
      context
    );

    if (metafieldNodes) {
      return metafieldNodes.map((metafieldNode: MetafieldFragmentWithDefinition) =>
        formatMetafieldForSchemaFromGraphQlApi(
          metafieldNode,
          ownerNodeGid,
          resourceMetafieldsSyncTableDefinition,
          context
        )
      );
    }
  },
});
// #endregion
