import * as coda from '@codahq/packs-sdk';

import {
  createResourceMetafield,
  deleteResourceMetafield,
  syncMetafields,
  fetchMetafield,
  fetchResourceMetafields,
  updateResourceMetafield,
  syncMetafieldsNew,
  getMetafieldSyncTableSchema,
} from './metafields-functions';

import { MetafieldSchema } from './metafields-schema';
import { makeGraphQlRequest } from '../helpers-graphql';

import {
  METAFIELDS_RESOURCE_TYPES,
  RESOURCE_ARTICLE,
  RESOURCE_BLOG,
  RESOURCE_COLLECTION,
  RESOURCE_CUSTOMER,
  RESOURCE_ORDER,
  RESOURCE_PAGE,
  RESOURCE_PRODUCT,
  RESOURCE_PRODUCT_VARIANT,
  REST_DEFAULT_API_VERSION,
} from '../constants';

export const setupMetafields = (pack) => {
interface ResourceMetafieldsSyncTableElements {
  key: string;
  display: string;
  adminSettingsUrlPart: string;
  adminEntryUrlPart: string;
  graphQlResourceQuery: string;
  metafieldOwnerType: string;
  storeFront?: boolean;
}
const resourceMetafieldsSyncTableElements: ResourceMetafieldsSyncTableElements[] = [
  {
    key: RESOURCE_ARTICLE,
    display: 'Article',
    adminSettingsUrlPart: 'article',
    adminEntryUrlPart: 'articles',
    graphQlResourceQuery: 'articles',
    metafieldOwnerType: 'ARTICLE',
  },
  {
    key: RESOURCE_BLOG,
    display: 'Blog',
    adminSettingsUrlPart: 'blog',
    adminEntryUrlPart: 'blogs',
    graphQlResourceQuery: 'blogs',
    metafieldOwnerType: 'BLOG',
    storeFront: true,
  },
  {
    key: RESOURCE_COLLECTION,
    display: 'Collection',
    adminSettingsUrlPart: 'collection',
    adminEntryUrlPart: 'collections',
    graphQlResourceQuery: 'collections',
    metafieldOwnerType: 'COLLECTION',
  },
  // {
  //   key: 'smart_collection',
  //   display: 'Smart Collection',
  //   adminUrlPart: 'collection',
  //   adminEntryUrlPart: 'collections',
  //   graphQlResourceQuery: 'collections',
  //   metafieldOwnerType: 'LOL',
  // },
  {
    key: RESOURCE_CUSTOMER,
    display: 'Customer',
    adminSettingsUrlPart: 'customer',
    adminEntryUrlPart: 'customers',
    graphQlResourceQuery: 'customers',
    metafieldOwnerType: 'CUSTOMER',
  },
  // TODO: maybe add suppoort for draft orders later
  // {
  //   key: 'draft_order',
  //   display: 'Draft Order',
  //   adminUrlPart: 'draftOrder',
  //   adminEntryUrlPart: 'draftOrders',
  //   graphQlResourceQuery: 'draftOrders',
  //   metafieldOwnerType: 'DRAFTORDER',
  // },
  {
    key: 'location',
    display: 'Location',
    adminSettingsUrlPart: 'location',
    adminEntryUrlPart: 'locations',
    graphQlResourceQuery: 'locations',
    metafieldOwnerType: 'LOCATION',
  },
  {
    key: RESOURCE_ORDER,
    display: 'Order',
    adminSettingsUrlPart: 'order',
    adminEntryUrlPart: 'orders',
    graphQlResourceQuery: 'orders',
    metafieldOwnerType: 'ORDER',
  },
  {
    key: RESOURCE_PAGE,
    display: 'Page',
    adminSettingsUrlPart: 'page',
    adminEntryUrlPart: 'pages',
    graphQlResourceQuery: 'pages',
    metafieldOwnerType: 'PAGE',
    storeFront: true,
  },
  {
    key: RESOURCE_PRODUCT,
    display: 'Product',
    adminSettingsUrlPart: 'product',
    adminEntryUrlPart: 'products',
    graphQlResourceQuery: 'products',
    metafieldOwnerType: 'PRODUCT',
    storeFront: true,
  },
  // {
  //   key: 'product_image',
  //   display: 'Product Image',
  //   adminUrlPart: 'article',
  //   adminEntryUrlPart: 'articles',
  //   graphQlResourceQuery: 'articles',
  //   metafieldOwnerType: 'LOL',
  // },
  {
    key: RESOURCE_PRODUCT_VARIANT,
    display: 'Product Variant',
    adminSettingsUrlPart: 'productVariant',
    adminEntryUrlPart: 'productVariants',
    graphQlResourceQuery: 'productVariants',
    metafieldOwnerType: 'PRODUCTVARIANT',
    storeFront: true,
  },
  // {
  //   key: RESOURCE_SHOP,
  //   display: 'Shop',
  //   adminSettingsUrlPart: 'shop',
  //   adminEntryUrlPart: 'shop',
  //   graphQlResourceQuery: 'shop',
  //   metafieldOwnerType: 'SHOP',
  // },
];
export const getResourceMetafieldsSyncTableElements = (value) =>
  resourceMetafieldsSyncTableElements.find((v) => v.key === value);

export const setupMetafields = (pack: coda.PackDefinitionBuilder) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addDynamicSyncTable({
    name: 'MetafieldsNew',
    description: 'All Shopify metafields',
    identityName: 'MetafieldNew',
    listDynamicUrls: async function (context, docUrl: String) {
      return resourceMetafieldsSyncTableElements.map((v) => {
        return {
          display: v.display,
          value: v.key,
          hasChildren: false,
        };
      });
    },
    getName: async function (context) {
      const definition = getResourceMetafieldsSyncTableElements(context.sync.dynamicUrl);
      if (!definition) throw new coda.UserVisibleError(`Unknown resource ${context.sync.dynamicUrl}`);
      return `${definition.display} metafields`;
    },
    getDisplayUrl: async function (context) {
      const definition = getResourceMetafieldsSyncTableElements(context.sync.dynamicUrl);
      if (!definition) throw new coda.UserVisibleError(`Unknown resource ${context.sync.dynamicUrl}`);
      return `${context.endpoint}/admin/settings/custom_data/${definition.adminSettingsUrlPart}/metafields`;
    },
    getSchema: getMetafieldSyncTableSchema,

    formula: {
      name: 'SyncMetafieldsNew',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [],
      execute: syncMetafieldsNew,
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  // Fetch Single Metafields
  pack.addFormula({
    name: 'Metafield',
    description: 'Get a single metafield by its id.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
    ],
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Object,
    schema: MetafieldSchema,
    execute: fetchMetafield,
  });

  // Fetch Resource Metafields
  pack.addFormula({
    name: 'Metafields',
    description: 'Get metafields from a specific resource.',
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
    ],
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Array,
    items: MetafieldSchema,
    execute: fetchResourceMetafields,
  });

  /**====================================================================================================================
   *    Actions
   *===================================================================================================================== */
  // Create single Resource Metafield
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
      const response = await createResourceMetafield([resourceId, resourceType, namespace, key, value, type], context);
      const { body } = response;
      return body.metafield.id;
    },
  });

  // Update single Resource Metafield
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
      const response = await updateResourceMetafield([metafieldId, resourceId, resourceType, value], context);
      return true;
    },
  });

  // Delete single Resource Metafield
  pack.addFormula({
    name: 'DeleteMetafield',
    description: 'delete metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
    ],
    isAction: true,
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Boolean,
    execute: async ([metafieldId], context) => {
      const response = await deleteResourceMetafield([metafieldId], context);
      return true;
    },
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'Metafield',
    instructions: 'Retrieve a single metafield',
    formulaName: 'Metafield',
  });
};
