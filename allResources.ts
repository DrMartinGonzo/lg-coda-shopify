// #region Imports
import { MetafieldOwnerType } from './types/admin.types';
import { RestResourceName, RestResourceSingular, RestResourcePlural } from './types/RequestsRest';
import { GraphQlResourceName } from './types/RequestsGraphQl';

import { ArticleSyncTableSchema } from './schemas/syncTable/ArticleSchema';
import { BlogSyncTableSchema } from './schemas/syncTable/BlogSchema';
import { CollectionSyncTableSchema } from './schemas/syncTable/CollectionSchema';
import { CollectSyncTableSchema } from './schemas/syncTable/CollectSchema';
import { CustomerSyncTableSchema } from './schemas/syncTable/CustomerSchema';
import { DraftOrderSyncTableSchema } from './schemas/syncTable/DraftOrderSchema';
import { InventoryLevelSyncTableSchema } from './schemas/syncTable/InventoryLevelSchema';
import { LocationSyncTableSchema } from './schemas/syncTable/LocationSchema';
import { OrderLineItemSyncTableSchema } from './schemas/syncTable/OrderLineItemSchema';
import { OrderSyncTableSchema } from './schemas/syncTable/OrderSchema';
import { PageSyncTableSchema } from './schemas/syncTable/PageSchema';
import { ProductSyncTableSchemaRest } from './schemas/syncTable/ProductSchemaRest';
import { ProductVariantSyncTableSchema } from './schemas/syncTable/ProductVariantSchema';
import { RedirectSyncTableSchema } from './schemas/syncTable/RedirectSchema';
import { ShopSyncTableSchema } from './schemas/syncTable/ShopSchema';

import type { ResourceTypeUnion, ResourceTypeGraphQlUnion } from './typesNew/allResources';

// #endregion

export const articleResource = {
  graphQl: {
    name: GraphQlResourceName.OnlineStoreArticle,
  },
  rest: {
    name: RestResourceName.Article,
    singular: RestResourceSingular.Article,
    plural: RestResourcePlural.Article,
  },
  metafieldOwnerType: MetafieldOwnerType.Article,
  schema: ArticleSyncTableSchema,
  useGraphQlForMetafields: false,
} as const;

export const blogResource = {
  graphQl: {
    name: GraphQlResourceName.OnlineStoreBlog,
  },
  rest: {
    name: RestResourceName.Blog,
    singular: RestResourceSingular.Blog,
    plural: RestResourcePlural.Blog,
  },
  metafieldOwnerType: MetafieldOwnerType.Blog,
  schema: BlogSyncTableSchema,
  useGraphQlForMetafields: false,
} as const;

export const collectionResource = {
  graphQl: {
    name: GraphQlResourceName.Collection,
  },
  rest: {
    name: RestResourceName.Collection,
    singular: RestResourceSingular.Collection,
    plural: RestResourcePlural.Collection,
  },
  metafieldOwnerType: MetafieldOwnerType.Collection,
  schema: CollectionSyncTableSchema,
  useGraphQlForMetafields: true,
} as const;

export const collectResource = {
  graphQl: {
    name: GraphQlResourceName.Collection,
  },
  rest: {
    name: RestResourceName.Collect,
    singular: RestResourceSingular.Collect,
    plural: RestResourcePlural.Collect,
  },
  schema: CollectSyncTableSchema,
} as const;

export const smartCollectionResource = {
  ...collectionResource,
  rest: {
    name: RestResourceName.SmartCollection,
    singular: RestResourceSingular.SmartCollection,
    plural: RestResourcePlural.SmartCollection,
  },
} as const;

export const customCollectionResource = {
  ...collectionResource,
  rest: {
    name: RestResourceName.CustomCollection,
    singular: RestResourceSingular.CustomCollection,
    plural: RestResourcePlural.CustomCollection,
  },
} as const;

export const customerResource = {
  graphQl: {
    name: GraphQlResourceName.Customer,
  },
  rest: {
    name: RestResourceName.Customer,
    singular: RestResourceSingular.Customer,
    plural: RestResourcePlural.Customer,
  },
  metafieldOwnerType: MetafieldOwnerType.Customer,
  schema: CustomerSyncTableSchema,
  useGraphQlForMetafields: true,
} as const;

export const draftOrderResource = {
  graphQl: {
    name: GraphQlResourceName.DraftOrder,
  },
  rest: {
    name: RestResourceName.DraftOrder,
    singular: RestResourceSingular.DraftOrder,
    plural: RestResourcePlural.DraftOrder,
  },
  metafieldOwnerType: MetafieldOwnerType.Draftorder,
  schema: DraftOrderSyncTableSchema,
  useGraphQlForMetafields: true,
} as const;

export const inventoryLevelResource = {
  rest: {
    name: RestResourceName.InventoryLevel,
    singular: RestResourceSingular.InventoryLevel,
    plural: RestResourcePlural.InventoryLevel,
  },
  schema: InventoryLevelSyncTableSchema,
} as const;

export const locationResource = {
  graphQl: {
    name: GraphQlResourceName.Location,
  },
  rest: {
    name: RestResourceName.Location,
    singular: RestResourceSingular.Location,
    plural: RestResourcePlural.Location,
  },
  metafieldOwnerType: MetafieldOwnerType.Location,
  schema: LocationSyncTableSchema,
  useGraphQlForMetafields: true,
} as const;

export const orderResource = {
  graphQl: {
    name: GraphQlResourceName.Order,
  },
  rest: {
    name: RestResourceName.Order,
    singular: RestResourceSingular.Order,
    plural: RestResourcePlural.Order,
  },
  metafieldOwnerType: MetafieldOwnerType.Order,
  schema: OrderSyncTableSchema,
  useGraphQlForMetafields: true,
} as const;

export const orderLineItemResource = {
  graphQl: {
    name: GraphQlResourceName.Order,
  },
  rest: {
    name: RestResourceName.Order,
    singular: RestResourceSingular.Order,
    plural: RestResourcePlural.Order,
  },
  schema: OrderLineItemSyncTableSchema,
} as const;

export const pageResource = {
  graphQl: {
    name: GraphQlResourceName.OnlineStorePage,
  },
  rest: {
    name: RestResourceName.Page,
    singular: RestResourceSingular.Page,
    plural: RestResourcePlural.Page,
  },
  metafieldOwnerType: MetafieldOwnerType.Page,
  schema: PageSyncTableSchema,
  useGraphQlForMetafields: false,
} as const;

export const productResource = {
  graphQl: {
    name: GraphQlResourceName.Product,
  },
  rest: {
    name: RestResourceName.Product,
    singular: RestResourceSingular.Product,
    plural: RestResourcePlural.Product,
  },
  metafieldOwnerType: MetafieldOwnerType.Product,
  schema: ProductSyncTableSchemaRest,
  useGraphQlForMetafields: true,
} as const;

export const productVariantResource = {
  graphQl: {
    name: GraphQlResourceName.ProductVariant,
  },
  rest: {
    name: RestResourceName.ProductVariant,
    singular: RestResourceSingular.ProductVariant,
    plural: RestResourcePlural.ProductVariant,
  },
  metafieldOwnerType: MetafieldOwnerType.Productvariant,
  schema: ProductVariantSyncTableSchema,
  useGraphQlForMetafields: true,
} as const;

export const redirectResource = {
  rest: {
    name: RestResourceName.Redirect,
    singular: RestResourceSingular.Redirect,
    plural: RestResourcePlural.Redirect,
  },
  schema: RedirectSyncTableSchema,
} as const;

export const shopVariantResource = {
  graphQl: {
    name: GraphQlResourceName.Shop,
  },
  rest: {
    name: RestResourceName.Shop,
    singular: RestResourceSingular.Shop,
    plural: RestResourcePlural.Shop,
  },
  metafieldOwnerType: MetafieldOwnerType.Shop,
  schema: ShopSyncTableSchema,
  useGraphQlForMetafields: false,
} as const;

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
  shopVariantResource,
];
export function getResourceDefinitionFromGraphQlName(graphQlName: GraphQlResourceName): ResourceTypeGraphQlUnion {
  return allResources.find(
    (resource) => 'graphQl' in resource && resource.graphQl.name === graphQlName
  ) as ResourceTypeGraphQlUnion;
}
