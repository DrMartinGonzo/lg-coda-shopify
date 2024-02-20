// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  deleteMetafieldRest,
  splitMetaFieldFullKey,
  setMetafieldsGraphQl,
  requireResourceMetafieldsSyncTableDefinition,
  formatMetafieldForSchemaFromGraphQlApi,
  fetchSingleMetafieldGraphQl,
  fetchMetafieldsGraphQl,
  formatMetafieldValueForApi,
  makeAutocompleteMetafieldKeysWithDefinitions,
  syncRestResourceMetafields,
  syncGraphQlResourceMetafields,
} from './metafields-functions';

import { MetafieldSchema, metafieldSyncTableHelperEditColumns } from '../schemas/syncTable/MetafieldSchema';
import { graphQlGidToId, idToGraphQlGid, makeGraphQlRequest } from '../helpers-graphql';
import { getRestResourceFromGraphQlResourceType } from '../helpers-rest';
import { parseAndValidateMetafieldValueFormulaInput } from '../helpers-setup';

import { createHash } from 'node:crypto';
import { MetafieldFragmentWithDefinition, SupportedGraphQlResourceWithMetafields } from '../types/Metafields';
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
import { GraphQlResource } from '../types/GraphQl';

// #endregion

// #region Helpers
async function getMetafieldSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = MetafieldSchema;
  const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;

  // Augment schema with a relation to the owner of the metafield
  const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
  let ownerReference: coda.GenericObjectSchema & coda.ObjectSchemaProperty;
  switch (resourceMetafieldsSyncTableDefinition.key) {
    case GraphQlResource.Article:
      ownerReference = ArticleReference;
      break;
    case GraphQlResource.Blog:
      ownerReference = BlogReference;
      break;
    case GraphQlResource.Collection:
      ownerReference = CollectionReference;
      break;
    case GraphQlResource.Customer:
      ownerReference = CustomerReference;
      break;
    case GraphQlResource.Location:
      ownerReference = LocationReference;
      break;
    case GraphQlResource.Order:
      ownerReference = OrderReference;
      break;
    case GraphQlResource.Page:
      ownerReference = PageReference;
      break;
    case GraphQlResource.Product:
      ownerReference = ProductReference;
      break;
    case GraphQlResource.ProductVariant:
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

  // admin_url should always be the last featured property, but Shop doesn't have one
  if (graphQlResource !== GraphQlResource.Shop) {
    augmentedSchema.featuredProperties.push('admin_url');
  }
  return augmentedSchema;
}

const parameters = {
  inputMetafieldID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'metafieldId',
    description: 'The ID of the metafield.',
  }),
  inputFullKeyWithAutocomplete: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fullKey',
    description:
      'The full key of the metafield. That is, the key prefixed with the namespace and separated by a dot. e.g. "namespace.key". If ownerType is completed and valid, you will get autocmplete suggestions, but only for metafields having a definition. Use `Show formula` button to enter a custom metafield key that doesn\'t have a definition.',
    autocomplete: async function (context, search, { ownerType }) {
      if (ownerType === undefined || ownerType === '') {
        return [];
      }
      const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(ownerType);
      return makeAutocompleteMetafieldKeysWithDefinitions(resourceMetafieldsSyncTableDefinition.metafieldOwnerType)(
        context,
        search,
        {}
      );
    },
  }),
  inputOwnerID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'ownerId',
    description: 'The ID of the resource owning the metafield.',
  }),
  inputOwnerIdOptional: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'ownerId',
    description: 'The ID of the resource owning the metafield. Not needed if requesting Shop metafields.',
    optional: true,
  }),
  inputOwnerType: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'ownerType',
    description: 'The type of the resource owning the metafield.',
    autocomplete: RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS.map((v) => ({
      display: v.display,
      value: v.key,
    })),
  }),
  inputValue: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'value',
    description:
      'A single metafield value written using one of the `Metafield{…}Value` formulas or a list of metafield values wrapped with the `MetafieldValues` formula. Setting it to an empty string will delete the metafield if it already exists.',
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
    const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
    return `${resourceMetafieldsSyncTableDefinition.display} metafields`;
  },
  /* Direct access to the metafield definition settings page for the resource */
  getDisplayUrl: async function (context) {
    const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
    // edge case: Shop doesn't have a dedicated page for metafield definitions
    if (graphQlResource === GraphQlResource.Shop) {
      return `${context.endpoint}/admin`;
    }

    const restResource = getRestResourceFromGraphQlResourceType(graphQlResource);
    const metafieldDefinitionsUrlPart = restResource.singular;
    return `${context.endpoint}/admin/settings/custom_data/${metafieldDefinitionsUrlPart}/metafields`;
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
      const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
      const isRestSync =
        graphQlResource === GraphQlResource.Article ||
        graphQlResource === GraphQlResource.Page ||
        graphQlResource === GraphQlResource.Blog;
      if (isRestSync) {
        return syncRestResourceMetafields(metafieldKeys, context);
      } else {
        return syncGraphQlResourceMetafields(metafieldKeys, context);
      }
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
      const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);

      const jobs = updates.map(async (update) => {
        // 'type' and 'owner_id' are required for the update to work
        if (update.previousValue.owner_id === undefined || update.previousValue.type === undefined) {
          throw new coda.UserVisibleError(
            'You need to have both `Type` and `Owner Id` columns in your table for the update to work'
          );
        }
        const { updatedFields } = update;
        const { type, owner_id } = update.previousValue;

        // We use rawValue as default, but if any helper edit column is set and has matching type, we use its value
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
        const ownerGid = idToGraphQlGid(resourceMetafieldsSyncTableDefinition.key, owner_id);
        const metafieldsSetInputs: MetafieldsSetInput[] = [
          {
            key: metaKey,
            namespace: metaNamespace,
            ownerId: ownerGid,
            type,
            value: value,
          },
        ];

        const { response } = await setMetafieldsGraphQl(metafieldsSetInputs, context);
        const metafield = response.body.data.metafieldsSet.metafields[0];
        return formatMetafieldForSchemaFromGraphQlApi(
          metafield,
          ownerGid,
          undefined,
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
export const Action_SetMetafield = coda.makeFormula({
  name: 'SetMetafield',
  description:
    'Set a metafield. If the metafield does not exist, it will be created. If it exists and you input an empty string, it will be deleted. Return the metafield data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    parameters.inputOwnerID,
    parameters.inputOwnerType,
    parameters.inputFullKeyWithAutocomplete,
    parameters.inputValue,
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  schema: MetafieldSchema,
  execute: async ([ownerId, graphQlOwnerType, fullKey, value], context) => {
    const restResource = getRestResourceFromGraphQlResourceType(graphQlOwnerType as GraphQlResource);
    const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(
      graphQlOwnerType as SupportedGraphQlResourceWithMetafields
    );
    const ownerGid = idToGraphQlGid(graphQlOwnerType, ownerId);

    // Check if the metafield already exists.
    const singleMetafieldResponse = await fetchSingleMetafieldGraphQl(
      {
        fullKey,
        graphQlResource: graphQlOwnerType as SupportedGraphQlResourceWithMetafields,
        cacheTtlSecs: 0,
        ownerGid,
      },
      context
    );

    let action: string;
    if (singleMetafieldResponse && (value === undefined || value === '')) {
      action = 'delete';
    } else if (singleMetafieldResponse) {
      action = 'update';
    } else if (value !== undefined && value !== '') {
      action = 'create';
    }

    /* ───────────────────────────────────────────────────────────────────────────────
       A metafield already exists, and the value is empty, we delete the metafield
    ┌───────────────────────────────────────────────────────────────────────────────── */
    if (action === 'delete') {
      const metafieldId = graphQlGidToId(singleMetafieldResponse.metafieldNode.id);
      await deleteMetafieldRest(metafieldId, context);
      // TODO: since we have set `required: true` on multiple schema properties, we have to send back the fiull object. We should change this.
      return {
        id: metafieldId,
        value: undefined,
        label: undefined,
        namespace: undefined,
        key: undefined,
        owner_id: undefined,
        type: undefined,
        created_at: undefined,
        updated_at: undefined,
        hasDefinition: undefined,
        owner_type: undefined,
      };
    }

    if (action === 'update' || action === 'create') {
      const parsedValue = parseAndValidateMetafieldValueFormulaInput(value);
      const finalValue = typeof parsedValue.value === 'string' ? parsedValue.value : JSON.stringify(parsedValue.value);

      /* ─────────────────────────────────────────
         A metafield already exists, we update
      ┌─────────────────────────────────────────── */
      if (action === 'update') {
        const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
        const metafieldsSetInputs: MetafieldsSetInput[] = [
          {
            key: metaKey,
            namespace: metaNamespace,
            ownerId: singleMetafieldResponse.ownerNodeGid,
            type: singleMetafieldResponse.metafieldNode.type,
            value: finalValue,
          },
        ];
        const { response } = await setMetafieldsGraphQl(metafieldsSetInputs, context);
        const metafield = response.body.data.metafieldsSet.metafields[0];
        return formatMetafieldForSchemaFromGraphQlApi(
          metafield,
          singleMetafieldResponse.ownerNodeGid,
          singleMetafieldResponse.parentOwnerNodeGid,
          resourceMetafieldsSyncTableDefinition,
          context
        );
      }

      /* ───────────────────────────
         We create the metafield
      ┌───────────────────────────── */
      if (action === 'create') {
        const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
        const metafieldsSetInputs: MetafieldsSetInput[] = [
          {
            key: metaKey,
            namespace: metaNamespace,
            ownerId: ownerGid,
            type: parsedValue.type,
            value: finalValue,
          },
        ];
        const { response } = await setMetafieldsGraphQl(metafieldsSetInputs, context);
        const metafield = response.body.data.metafieldsSet.metafields[0];
        return formatMetafieldForSchemaFromGraphQlApi(
          metafield,
          ownerGid,
          undefined,
          resourceMetafieldsSyncTableDefinition,
          context
        );
      }
    }

    // Do nothing and return empty object
    return {
      id: undefined,
      value: undefined,
      label: undefined,
      namespace: undefined,
      key: undefined,
      owner_id: undefined,
      type: undefined,
      created_at: undefined,
      updated_at: undefined,
      hasDefinition: undefined,
      owner_type: undefined,
    };
  },
});

export const Action_DeleteMetafield = coda.makeFormula({
  name: 'DeleteMetafield',
  description: 'delete metafield.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [{ ...parameters.inputMetafieldID, description: 'The ID of the metafield to delete.' }],
  isAction: true,
  cacheTtlSecs: 0,
  resultType: coda.ValueType.Boolean,
  execute: async ([metafieldId], context) => {
    await deleteMetafieldRest(metafieldId, context);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Metafield = coda.makeFormula({
  name: 'Metafield',
  description: 'Get a single metafield by its fullkey.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.inputOwnerType, parameters.inputFullKeyWithAutocomplete, parameters.inputOwnerIdOptional],
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

    const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
    const singleMetafieldResponse = await fetchSingleMetafieldGraphQl(
      {
        graphQlResource,
        fullKey,
        ownerGid: ownerId ? idToGraphQlGid(graphQlResource, ownerId) : undefined,
        cacheTtlSecs: 0,
      },
      context
    );
    if (singleMetafieldResponse) {
      const { metafieldNode, ownerNodeGid, parentOwnerNodeGid } = singleMetafieldResponse;
      return formatMetafieldForSchemaFromGraphQlApi(
        metafieldNode,
        ownerNodeGid,
        parentOwnerNodeGid,
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
  parameters: [parameters.inputOwnerType, parameters.inputOwnerIdOptional],
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

    const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
    const { metafieldNodes, ownerNodeGid, parentOwnerNodeGid } = await fetchMetafieldsGraphQl(
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
          parentOwnerNodeGid,
          resourceMetafieldsSyncTableDefinition,
          context
        )
      );
    }
  },
});
// #endregion
