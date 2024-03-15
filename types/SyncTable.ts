import * as coda from '@codahq/packs-sdk';
import type { MetafieldDefinition } from '../typesNew/generated/admin.types';
import type { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from '../typesNew/Fetcher';

import type { ResourceTypeUnion } from '../typesNew/allResources';
import type { Article } from '../typesNew/Resources/Article';
import type { Blog } from '../typesNew/Resources/Blog';
import type { Collect } from '../typesNew/Resources/Collect';
import type { Collection } from '../typesNew/Resources/Collection';
import type { Customer } from '../typesNew/Resources/Customer';
import type { DraftOrder } from '../typesNew/Resources/DraftOrder';
import type { InventoryLevel } from '../typesNew/Resources/InventoryLevel';
import type { Order } from '../typesNew/Resources/Order';
import type { Page } from '../typesNew/Resources/Page';
import type { Product } from '../typesNew/Resources/Product';
import type { ProductVariant } from '../typesNew/Resources/ProductVariant';
import type { Redirect } from '../typesNew/Resources/Redirect';
import type { Shop } from '../typesNew/Resources/Shop';

import type { ArticleSyncTableSchema } from '../schemas/syncTable/ArticleSchema';
import type { BlogSyncTableSchema } from '../schemas/syncTable/BlogSchema';
import type { CollectionSyncTableSchema } from '../schemas/syncTable/CollectionSchema';
import type { CollectSyncTableSchema } from '../schemas/syncTable/CollectSchema';
import type { CustomerSyncTableSchema } from '../schemas/syncTable/CustomerSchema';
import type { DraftOrderSyncTableSchema } from '../schemas/syncTable/DraftOrderSchema';
import type { InventoryLevelSyncTableSchema } from '../schemas/syncTable/InventoryLevelSchema';
import type { OrderSyncTableSchema } from '../schemas/syncTable/OrderSchema';
import type { PageSyncTableSchema } from '../schemas/syncTable/PageSchema';
import type { ProductSyncTableSchemaRest } from '../schemas/syncTable/ProductSchemaRest';
import type { ProductVariantSyncTableSchema } from '../schemas/syncTable/ProductVariantSchema';
import type { RedirectSyncTableSchema } from '../schemas/syncTable/RedirectSchema';
import type { ShopSyncTableSchema } from '../schemas/syncTable/ShopSchema';

import type { ArticleSyncTableType } from '../articles/articles-functions';
import type { BlogSyncTableType } from '../blogs/blogs-functions';
import type { BaseRow } from '../typesNew/CodaRows';
import type {
  CollectSyncTableType,
  CollectionSyncTableType,
  CustomCollectionSyncTableType,
  SmartCollectionSyncTableType,
} from '../collections/collections-functions';
import type { CustomerSyncTableType } from '../customers/customers-functions';
import type { DraftOrderSyncTableType } from '../draftOrders/draftOrders-functions';
import type { InventoryLevelSyncTableType } from '../inventoryLevels/inventoryLevels-functions';
import type { OrderSyncTableType } from '../orders/orders-functions';
import type { OrderLineItemSyncTableType } from '../orderLineItems/orderLineItems-functions';
import type { PageSyncTableType } from '../pages/pages-functions';
import type { RedirectSyncTableType } from '../redirects/redirects-functions';
import type { ProductSyncTableType } from '../products/products-functions';
import type { ProductVariantSyncTableType } from '../productVariants/productVariants-functions';
import type { ShopSyncTableType } from '../shop/shop-functions';
import type { LocationSyncTableType } from '../locations/locations-functions';

// #region Types
export type SyncTableType<
  T extends ResourceTypeUnion,
  CodaRow extends BaseRow,
  SyncParamsT extends RestSyncParamsUnion = never,
  CreateParamsT extends RestCreateParamsUnion = never,
  UpdateParamsT extends RestUpdateParamsUnion = never
> = T & {
  codaRow: CodaRow;
  rest: {
    singleFetchResponse: Record<T['rest']['singular'], CodaRow>;
    multipleFetchResponse: Record<T['rest']['plural'], Array<CodaRow>>;
    params: {
      sync: SyncParamsT;
      create: CreateParamsT;
      update: UpdateParamsT;
    };
  };
};

export type SyncTableTypeUnion =
  | ArticleSyncTableType
  | BlogSyncTableType
  | CollectionSyncTableType
  | CustomCollectionSyncTableType
  | SmartCollectionSyncTableType
  | CollectSyncTableType
  | CustomerSyncTableType
  | DraftOrderSyncTableType
  | InventoryLevelSyncTableType
  | LocationSyncTableType
  | OrderSyncTableType
  | OrderLineItemSyncTableType
  | PageSyncTableType
  | ProductSyncTableType
  | ProductVariantSyncTableType
  | RedirectSyncTableType
  | ShopSyncTableType;

export type RestSyncParamsUnion =
  | Article.Params.Sync
  | Blog.Params.Sync
  | Collect.Params.Sync
  | Collection.Params.Sync
  | Customer.Params.Sync
  | DraftOrder.Params.Sync
  | InventoryLevel.Params.Sync
  | Order.Params.Sync
  | Page.Params.Sync
  | Product.Params.Sync
  | ProductVariant.Params.Sync
  | Redirect.Params.Sync
  | Shop.Params.Sync;

export type RestCreateParamsUnion =
  | Article.Params.Create
  | Blog.Params.Create
  | Collection.Params.Create
  | Customer.Params.Create
  | Page.Params.Create
  | Product.Params.Create
  | ProductVariant.Params.Create
  | Redirect.Params.Create;

export type RestUpdateParamsUnion =
  | Article.Params.Update
  | Blog.Params.Update
  | Collection.Params.Update
  | Customer.Params.Update
  | DraftOrder.Params.Update
  | Order.Params.Update
  | Page.Params.Update
  | Product.Params.Update
  | ProductVariant.Params.Update
  | Redirect.Params.Update;

export type SyncTableSchemaUnion =
  | typeof ArticleSyncTableSchema
  | typeof BlogSyncTableSchema
  | typeof CollectionSyncTableSchema
  | typeof CollectSyncTableSchema
  | typeof CustomerSyncTableSchema
  | typeof DraftOrderSyncTableSchema
  | typeof InventoryLevelSyncTableSchema
  | typeof OrderSyncTableSchema
  | typeof PageSyncTableSchema
  | typeof ProductSyncTableSchemaRest
  | typeof ProductVariantSyncTableSchema
  | typeof RedirectSyncTableSchema
  | typeof ShopSyncTableSchema;

export interface SyncTableRestContinuation extends coda.Continuation {
  nextUrl?: string;
  extraContinuationData: any;
}

export interface SyncTableGraphQlContinuation extends coda.Continuation {
  cursor?: string;
  retries: number;
  extraContinuationData: any;
  graphQlLock: string;

  lastMaxEntriesPerRun?: number;
  reducedMaxEntriesPerRun?: number;
  lastCost?: Omit<ShopifyGraphQlRequestCost, 'throttleStatus'>;
  lastThrottleStatus?: ShopifyGraphQlThrottleStatus;
}

export interface SyncTableRestAugmentedContinuation extends SyncTableRestContinuation, SyncTableGraphQlContinuation {
  graphQlPayload?: any;
  remainingRestItems?: any;
  prevRestNextUrl?: string;
  nextRestUrl?: string;
  scheduledNextRestUrl?: string;
}

export interface SyncTableMixedContinuation extends SyncTableRestContinuation, SyncTableGraphQlContinuation {
  scheduledNextRestUrl?: string;
  // @ts-ignore
  extraContinuationData: {
    skipNextRestSync: boolean;
    metafieldDefinitions: MetafieldDefinition[];
    /** Utilisé pour déterminer le type de ressource à récupérer, à la prochaine
     * requête Rest. Par ex. pour les collections. */
    restType?: string;
    currentBatch: {
      remaining: any[];
      processing: any[];
    };
  };
}

export interface FieldDependency<T extends coda.ObjectSchemaProperties> {
  field: keyof T | string;
  dependencies: (keyof T)[] | string[];
}
// #endregion
