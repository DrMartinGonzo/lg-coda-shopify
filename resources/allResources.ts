// #region Imports
import { MetafieldOwnerType } from '../types/generated/admin.types';
import { RestResourceSingular, RestResourcePlural } from '../types/ShopifyRestResourceTypes';
import { GraphQlResourceName } from '../types/ShopifyGraphQlResourceTypes';

import { ArticleSyncTableSchema } from '../schemas/syncTable/ArticleSchema';
import { BlogSyncTableSchema } from '../schemas/syncTable/BlogSchema';
import { CollectionSyncTableSchema } from '../schemas/syncTable/CollectionSchema';
import { CollectSyncTableSchema } from '../schemas/syncTable/CollectSchema';
import { CustomerSyncTableSchema } from '../schemas/syncTable/CustomerSchema';
import { DraftOrderSyncTableSchema } from '../schemas/syncTable/DraftOrderSchema';
import { InventoryLevelSyncTableSchema } from '../schemas/syncTable/InventoryLevelSchema';
import { LocationSyncTableSchema } from '../schemas/syncTable/LocationSchema';
import { OrderLineItemSyncTableSchema } from '../schemas/syncTable/OrderLineItemSchema';
import { OrderSyncTableSchema } from '../schemas/syncTable/OrderSchema';
import { PageSyncTableSchema } from '../schemas/syncTable/PageSchema';
import { ProductSyncTableSchemaRest } from '../schemas/syncTable/ProductSchemaRest';
import { ProductVariantSyncTableSchema } from '../schemas/syncTable/ProductVariantSchema';
import { RedirectSyncTableSchema } from '../schemas/syncTable/RedirectSchema';
import { ShopSyncTableSchema } from '../schemas/syncTable/ShopSchema';

import type {
  ResourceTypeUnion,
  ResourceTypeGraphQlUnion,
  HasMetafieldSyncTableResourceTypeUnion,
  SupportMetafieldDefinitionsResourceTypeUnion,
} from '../types/allResources';

// #endregion

// #region Definitions
export const articleResource = {
  display: 'Article',
  graphQl: {
    name: GraphQlResourceName.OnlineStoreArticle,
  },
  rest: {
    // name: RestResourceName.Article,
    singular: RestResourceSingular.Article,
    plural: RestResourcePlural.Article,
  },
  metafieldOwnerType: MetafieldOwnerType.Article,
  useGraphQlForMetafields: false,
  hasMetafieldSyncTable: true,
  supportMetafieldDefinitions: true,
  schema: ArticleSyncTableSchema,
} as const;

export const blogResource = {
  display: 'Blog',
  graphQl: {
    name: GraphQlResourceName.OnlineStoreBlog,
  },
  rest: {
    // name: RestResourceName.Blog,
    singular: RestResourceSingular.Blog,
    plural: RestResourcePlural.Blog,
  },
  metafieldOwnerType: MetafieldOwnerType.Blog,
  useGraphQlForMetafields: false,
  hasMetafieldSyncTable: true,
  supportMetafieldDefinitions: true,
  schema: BlogSyncTableSchema,
} as const;

export const collectionResource = {
  display: 'Collection',
  graphQl: {
    name: GraphQlResourceName.Collection,
    singular: 'collection',
    plural: 'collections',
  },
  rest: {
    // name: RestResourceName.Collection,
    singular: RestResourceSingular.Collection,
    plural: RestResourcePlural.Collection,
  },
  metafieldOwnerType: MetafieldOwnerType.Collection,
  useGraphQlForMetafields: true,
  hasMetafieldSyncTable: true,
  supportMetafieldDefinitions: true,
  schema: CollectionSyncTableSchema,
} as const;

export const collectResource = {
  display: 'Collect',
  graphQl: {
    name: GraphQlResourceName.Collection,
  },
  rest: {
    // name: RestResourceName.Collect,
    singular: RestResourceSingular.Collect,
    plural: RestResourcePlural.Collect,
  },
  schema: CollectSyncTableSchema,
} as const;

export const smartCollectionResource = {
  ...collectionResource,
  display: 'Smart Collection',
  rest: {
    // name: RestResourceName.SmartCollection,
    singular: RestResourceSingular.SmartCollection,
    plural: RestResourcePlural.SmartCollection,
  },
  hasMetafieldSyncTable: false,
} as const;

export const customCollectionResource = {
  ...collectionResource,
  display: 'Custom Collection',
  rest: {
    // name: RestResourceName.CustomCollection,
    singular: RestResourceSingular.CustomCollection,
    plural: RestResourcePlural.CustomCollection,
  },
  hasMetafieldSyncTable: false,
} as const;

export const customerResource = {
  display: 'Customer',
  graphQl: {
    name: GraphQlResourceName.Customer,
    singular: 'customer',
    plural: 'customers',
  },
  rest: {
    // name: RestResourceName.Customer,
    singular: RestResourceSingular.Customer,
    plural: RestResourcePlural.Customer,
  },
  metafieldOwnerType: MetafieldOwnerType.Customer,
  useGraphQlForMetafields: true,
  hasMetafieldSyncTable: true,
  supportMetafieldDefinitions: true,
  schema: CustomerSyncTableSchema,
} as const;

export const draftOrderResource = {
  display: 'Draft Order',
  graphQl: {
    name: GraphQlResourceName.DraftOrder,
    singular: 'draftOrder',
    plural: 'draftOrders',
  },
  rest: {
    // name: RestResourceName.DraftOrder,
    singular: RestResourceSingular.DraftOrder,
    plural: RestResourcePlural.DraftOrder,
  },
  metafieldOwnerType: MetafieldOwnerType.Draftorder,
  useGraphQlForMetafields: true,
  hasMetafieldSyncTable: true,
  supportMetafieldDefinitions: true,
  schema: DraftOrderSyncTableSchema,
} as const;

export const inventoryLevelResource = {
  display: 'Inventory Level',
  rest: {
    // name: RestResourceName.InventoryLevel,
    singular: RestResourceSingular.InventoryLevel,
    plural: RestResourcePlural.InventoryLevel,
  },
  schema: InventoryLevelSyncTableSchema,
} as const;

export const locationResource = {
  display: 'Location',
  graphQl: {
    name: GraphQlResourceName.Location,
    singular: 'location',
    plural: 'locations',
  },
  rest: {
    // name: RestResourceName.Location,
    singular: RestResourceSingular.Location,
    plural: RestResourcePlural.Location,
  },
  metafieldOwnerType: MetafieldOwnerType.Location,
  useGraphQlForMetafields: true,
  hasMetafieldSyncTable: true,
  supportMetafieldDefinitions: true,
  schema: LocationSyncTableSchema,
} as const;

export const orderResource = {
  display: 'Order',
  graphQl: {
    name: GraphQlResourceName.Order,
    singular: 'order',
    plural: 'orders',
  },
  rest: {
    // name: RestResourceName.Order,
    singular: RestResourceSingular.Order,
    plural: RestResourcePlural.Order,
  },
  metafieldOwnerType: MetafieldOwnerType.Order,
  useGraphQlForMetafields: true,
  hasMetafieldSyncTable: true,
  supportMetafieldDefinitions: true,
  schema: OrderSyncTableSchema,
} as const;

export const orderLineItemResource = {
  display: 'Order Line Item',
  graphQl: {
    name: GraphQlResourceName.Order,
  },
  rest: {
    // name: RestResourceName.Order,
    singular: RestResourceSingular.Order,
    plural: RestResourcePlural.Order,
  },
  schema: OrderLineItemSyncTableSchema,
} as const;

export const pageResource = {
  display: 'Page',
  graphQl: {
    name: GraphQlResourceName.OnlineStorePage,
  },
  rest: {
    // name: RestResourceName.Page,
    singular: RestResourceSingular.Page,
    plural: RestResourcePlural.Page,
  },
  metafieldOwnerType: MetafieldOwnerType.Page,
  useGraphQlForMetafields: false,
  hasMetafieldSyncTable: true,
  supportMetafieldDefinitions: true,
  schema: PageSyncTableSchema,
} as const;

export const productResource = {
  display: 'Product',
  graphQl: {
    name: GraphQlResourceName.Product,
    singular: 'product',
    plural: 'products',
  },
  rest: {
    // name: RestResourceName.Product,
    singular: RestResourceSingular.Product,
    plural: RestResourcePlural.Product,
  },
  metafieldOwnerType: MetafieldOwnerType.Product,
  useGraphQlForMetafields: true,
  hasMetafieldSyncTable: true,
  supportMetafieldDefinitions: true,
  schema: ProductSyncTableSchemaRest,
} as const;

export const productVariantResource = {
  display: 'Product Variant',
  graphQl: {
    name: GraphQlResourceName.ProductVariant,
    singular: 'productVariant',
    plural: 'productVariants',
  },
  rest: {
    // name: RestResourceName.ProductVariant,
    singular: RestResourceSingular.ProductVariant,
    plural: RestResourcePlural.ProductVariant,
  },
  metafieldOwnerType: MetafieldOwnerType.Productvariant,
  useGraphQlForMetafields: true,
  hasMetafieldSyncTable: true,
  supportMetafieldDefinitions: true,
  schema: ProductVariantSyncTableSchema,
} as const;

export const redirectResource = {
  display: 'Redirect',
  rest: {
    // name: RestResourceName.Redirect,
    singular: RestResourceSingular.Redirect,
    plural: RestResourcePlural.Redirect,
  },
  schema: RedirectSyncTableSchema,
} as const;

export const shopResource = {
  display: 'Shop',
  graphQl: {
    name: GraphQlResourceName.Shop,
    singular: 'shop',
    plural: 'shop',
  },
  rest: {
    // name: RestResourceName.Shop,
    singular: RestResourceSingular.Shop,
    plural: RestResourcePlural.Shop,
  },
  metafieldOwnerType: MetafieldOwnerType.Shop,
  // TODO: check this is correct
  useGraphQlForMetafields: true,
  hasMetafieldSyncTable: true,
  supportMetafieldDefinitions: false,
  schema: ShopSyncTableSchema,
} as const;
// #endregion

const allResources: ResourceTypeUnion[] = [
  articleResource,
  blogResource,
  collectionResource,
  customCollectionResource,
  smartCollectionResource,
  collectResource,
  customerResource,
  draftOrderResource,
  inventoryLevelResource,
  locationResource,
  orderResource,
  orderLineItemResource,
  pageResource,
  productResource,
  productVariantResource,
  redirectResource,
  shopResource,
];

// #region Helpers
export const getResourceDefinitionsWithMetaFieldSyncTable = (): HasMetafieldSyncTableResourceTypeUnion[] =>
  allResources.filter(
    (resource) =>
      'metafieldOwnerType' in resource && 'hasMetafieldSyncTable' in resource && resource.hasMetafieldSyncTable === true
  ) as HasMetafieldSyncTableResourceTypeUnion[];

export const getResourceDefinitionsWithMetaFieldDefinitionSyncTable =
  (): SupportMetafieldDefinitionsResourceTypeUnion[] =>
    allResources.filter(
      (resource) =>
        'metafieldOwnerType' in resource &&
        'supportMetafieldDefinitions' in resource &&
        resource.supportMetafieldDefinitions === true
    ) as SupportMetafieldDefinitionsResourceTypeUnion[];

export function getResourceDefinitionByGraphQlName(graphQlName: GraphQlResourceName): ResourceTypeGraphQlUnion {
  return allResources.find(
    (resource) => 'graphQl' in resource && resource.graphQl.name === graphQlName
  ) as ResourceTypeGraphQlUnion;
}
export function requireResourceDefinitionWithMetaFieldOwnerType(
  metafieldOwnerType: MetafieldOwnerType
): HasMetafieldSyncTableResourceTypeUnion {
  const definition = allResources.find(
    (resource) => 'metafieldOwnerType' in resource && resource.metafieldOwnerType === metafieldOwnerType
  ) as HasMetafieldSyncTableResourceTypeUnion;
  if (!definition) {
    throw new Error('Unknown MetafieldOwnerType: ' + MetafieldOwnerType);
  }
  return definition;
}
// #endregion
