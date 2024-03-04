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
  syncRestResourceMetafields,
  syncGraphQlResourceMetafields,
  updateResourceMetafieldsRest,
  normalizeRestMetafieldResponseToGraphQLResponse,
  updateResourceMetafieldsGraphQl,
  DeletedMetafieldsByKeysRest,
  shouldDeleteMetafield,
} from './metafields-functions';

import { MetafieldSyncTableSchema, metafieldSyncTableHelperEditColumns } from '../schemas/syncTable/MetafieldSchema';
import { graphQlGidToId, idToGraphQlGid, makeGraphQlRequest } from '../helpers-graphql';
import { getRestResourceFromGraphQlResourceType } from '../helpers-rest';
import { CodaMetafieldKeyValueSet, parseAndValidateMetafieldValueFormulaInput } from '../helpers-setup';

import { createHash } from 'node:crypto';
import { ArticleReference } from '../schemas/syncTable/ArticleSchema';
import { BlogReference } from '../schemas/syncTable/BlogSchema';
import { CollectionReference } from '../schemas/syncTable/CollectionSchema';
import { CustomerReference } from '../schemas/syncTable/CustomerSchema';
import { LocationReference } from '../schemas/syncTable/LocationSchema';
import { OrderReference } from '../schemas/syncTable/OrderSchema';
import { PageReference } from '../schemas/syncTable/PageSchema';
import { ProductReference } from '../schemas/syncTable/ProductSchemaRest';
import { ProductVariantReference } from '../schemas/syncTable/ProductVariantSchema';

import { RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS } from './metafields-constants';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { retrieveObjectSchemaEffectiveKeys } from '../helpers';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';
import { CACHE_DEFAULT, CACHE_DISABLED, IDENTITY_METAFIELD } from '../constants';
import { getMetafieldDefinitionReferenceSchema } from '../schemas/syncTable/MetafieldDefinitionSchema';
import { filters, inputs } from '../shared-parameters';

import type { Metafield as MetafieldRest } from '@shopify/shopify-api/rest/admin/2023-10/metafield';
import type { MetafieldDefinitionFragment } from '../types/admin.generated';
import type { MetafieldsSetInput } from '../types/admin.types';
import type { MetafieldFragmentWithDefinition, SupportedGraphQlResourceWithMetafields } from '../types/Metafields';

// #endregion

// #region Helpers
async function getMetafieldSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = MetafieldSyncTableSchema;
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
    // @ts-ignore
    augmentedSchema.featuredProperties.push('owner');
  }

  if (graphQlResource !== GraphQlResource.Shop) {
    // Shop doesn't have metafield definitions
    (augmentedSchema.properties['definition_id'] = {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      fixedId: 'definition_id',
      fromKey: 'definition_id',
      description: 'The ID of the metafield definition of the metafield, if it exists.',
    }),
      (augmentedSchema.properties['definition'] = {
        ...getMetafieldDefinitionReferenceSchema(resourceMetafieldsSyncTableDefinition),
        fromKey: 'definition',
        fixedId: 'definition',
        description: 'The metafield definition of the metafield, if it exists.',
      });
    // @ts-ignore: admin_url should always be the last featured property, but Shop doesn't have one
    augmentedSchema.featuredProperties.push('admin_url');
  }
  return augmentedSchema;
}
// #endregion

// #region Sync tables
export const Sync_Metafields = coda.makeDynamicSyncTable({
  name: 'Metafields',
  description: 'Return Metafields from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_METAFIELD,
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
    return `Metafields_${resourceMetafieldsSyncTableDefinition.display}`;
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
    parameters: [{ ...filters.metafield.metafieldKeys, optional: true }],
    execute: async function ([metafieldKeys], context) {
      const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
      const isRestSync =
        graphQlResource === GraphQlResource.Article ||
        graphQlResource === GraphQlResource.Page ||
        graphQlResource === GraphQlResource.Blog;
      const filteredMetafieldKeys = Array.isArray(metafieldKeys)
        ? metafieldKeys.filter((key) => key !== undefined && key !== '')
        : [];
      if (isRestSync) {
        return syncRestResourceMetafields(filteredMetafieldKeys, context);
      } else {
        return syncGraphQlResourceMetafields(filteredMetafieldKeys, context);
      }
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
      const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
      const isRestUpdate = [GraphQlResource.Article, GraphQlResource.Page, GraphQlResource.Blog].includes(
        graphQlResource
      );

      // MetafieldDefinitionFragment is included in each GraphQL mutation response, not in Rest
      let metafieldDefinitions: MetafieldDefinitionFragment[];
      if (isRestUpdate) {
        metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(
          { ownerType: resourceMetafieldsSyncTableDefinition.metafieldOwnerType },
          context
        );
      }

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
        let value: string | null = update.newValue.rawValue as string;
        for (let i = 0; i < metafieldSyncTableHelperEditColumns.length; i++) {
          const item = metafieldSyncTableHelperEditColumns[i];
          if (updatedFields.includes(item.key)) {
            if (type === item.type) {
              value = await formatMetafieldValueForApi(update.newValue[item.key], type, context);
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
        }

        let deletedMetafields: DeletedMetafieldsByKeysRest[];
        let updatedMetafields: MetafieldRest[] | MetafieldFragmentWithDefinition[];
        const fullKey = update.previousValue.label as string;
        const metafieldKeyValueSet: CodaMetafieldKeyValueSet = {
          key: fullKey,
          value,
          type,
        };

        if (isRestUpdate) {
          const restResource = getRestResourceFromGraphQlResourceType(resourceMetafieldsSyncTableDefinition.key);
          ({ deletedMetafields, updatedMetafields } = await updateResourceMetafieldsRest(
            owner_id,
            restResource,
            [metafieldKeyValueSet],
            context
          ));
        } else {
          const ownerGid = idToGraphQlGid(resourceMetafieldsSyncTableDefinition.key, owner_id);
          ({ deletedMetafields, updatedMetafields } = await updateResourceMetafieldsGraphQl(
            ownerGid,
            [metafieldKeyValueSet],
            context
          ));
        }

        if (updatedMetafields.length) {
          const isGraphQlMetafields = updatedMetafields.every(
            (m) => m.hasOwnProperty('__typename') && m.__typename === GraphQlResource.Metafield
          );

          if (isGraphQlMetafields) {
            const updatedMetafield = updatedMetafields[0] as MetafieldFragmentWithDefinition;
            const ownerGid = idToGraphQlGid(resourceMetafieldsSyncTableDefinition.key, owner_id);
            return {
              ...update.previousValue,
              ...formatMetafieldForSchemaFromGraphQlApi(
                updatedMetafield,
                ownerGid,
                undefined,
                resourceMetafieldsSyncTableDefinition,
                context
              ),
            };
          } else {
            const updatedMetafield = updatedMetafields[0] as MetafieldRest;
            return {
              ...update.previousValue,
              ...formatMetafieldForSchemaFromGraphQlApi(
                normalizeRestMetafieldResponseToGraphQLResponse(
                  updatedMetafield,
                  resourceMetafieldsSyncTableDefinition.metafieldOwnerType,
                  metafieldDefinitions
                ),
                idToGraphQlGid(graphQlResource, updatedMetafield.owner_id),
                undefined,
                resourceMetafieldsSyncTableDefinition,
                context
              ),
            };
          }
        } else if (deletedMetafields.length) {
          let deletedObj = { ...update.previousValue };
          Object.keys(deletedObj)
            // we keep these keys so that we can later recreate the metafield without having to use a button
            .filter((key) => !['id', 'label', 'owner_id', 'type', 'owner'].includes(key))
            .forEach((key) => {
              delete deletedObj[key];
            });
          return deletedObj;
        }
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
  parameters: [inputs.metafield.ownerID, inputs.metafield.ownerType, inputs.metafield.fullKey, inputs.metafield.value],
  isAction: true,
  resultType: coda.ValueType.Object,
  schema: MetafieldSyncTableSchema,
  execute: async ([ownerId, graphQlOwnerType, fullKey, value], context) => {
    const schemaEffectiveKeys = retrieveObjectSchemaEffectiveKeys(MetafieldSyncTableSchema);
    const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(
      graphQlOwnerType as SupportedGraphQlResourceWithMetafields
    );
    const ownerGid = idToGraphQlGid(graphQlOwnerType, ownerId);

    // Check if the metafield already exists.
    const singleMetafieldResponse = await fetchSingleMetafieldGraphQl(
      {
        fullKey,
        graphQlResource: graphQlOwnerType as SupportedGraphQlResourceWithMetafields,
        ownerGid,
      },
      context,
      {
        cacheTtlSecs: CACHE_DISABLED,
      }
    );

    let action: string;
    if (shouldDeleteMetafield(value) && singleMetafieldResponse) {
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

      // we keep these keys so that we can later recreate the metafield without having to use a button
      const deletedObj = {
        id: metafieldId,
        label: fullKey,
        owner_id: ownerId,
        owner_type: resourceMetafieldsSyncTableDefinition.key,
        type: singleMetafieldResponse.metafieldNode.type,
      };
      // add all other missing properties and set them to undefined
      schemaEffectiveKeys.forEach((key) => {
        if (!deletedObj.hasOwnProperty(key)) {
          deletedObj[key] = undefined;
        }
      });

      return deletedObj;
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
          metafield as MetafieldFragmentWithDefinition,
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
          metafield as MetafieldFragmentWithDefinition,
          ownerGid,
          undefined,
          resourceMetafieldsSyncTableDefinition,
          context
        );
      }
    }

    // Do nothing and return empty object
    const emptyObj = {
      id: undefined,
      label: undefined,
      owner_id: undefined,
      owner_type: undefined,
      type: undefined,
    };
    schemaEffectiveKeys.forEach((key) => {
      emptyObj[key] = undefined;
    });
    return emptyObj;
  },
});

export const Action_DeleteMetafield = coda.makeFormula({
  name: 'DeleteMetafield',
  description: 'delete metafield.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [{ ...inputs.metafield.id, description: 'The ID of the metafield to delete.' }],
  isAction: true,
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
  parameters: [
    inputs.metafield.ownerType,
    inputs.metafield.fullKey,
    {
      ...inputs.metafield.ownerID,
      description: inputs.metafield.ownerID.description + ' Not needed if requesting Shop metafields.',
      optional: true,
    },
  ],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: MetafieldSyncTableSchema,
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
      },
      context,
      {
        cacheTtlSecs: CACHE_DISABLED,
      }
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
  parameters: [
    inputs.metafield.ownerType,
    {
      ...inputs.metafield.ownerID,
      description: inputs.metafield.ownerID.description + ' Not needed if requesting Shop metafields.',
      optional: true,
    },
  ],
  cacheTtlSecs: CACHE_DISABLED, // Cache is disabled intentionally
  resultType: coda.ValueType.Array,
  items: MetafieldSyncTableSchema,
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
      },
      context,
      {
        cacheTtlSecs: CACHE_DISABLED, // Cache is disabled intentionally
      }
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
