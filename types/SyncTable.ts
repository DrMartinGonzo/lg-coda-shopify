import * as coda from '@codahq/packs-sdk';
import type { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from './ShopifyGraphQl';
import type { MetafieldDefinition } from './admin.types';

import type { Article } from '../typesNew/Resources/Article';
import type { Blog } from '../typesNew/Resources/Blog';
import type { Collection } from '../typesNew/Resources/Collection';

import type { DraftOrderSyncTableRestParams, DraftOrderUpdateRestParams } from './DraftOrder';
import type { InventoryLevelSyncTableRestParams } from './InventoryLevel';
import type { OrderSyncTableRestParams, OrderUpdateRestParams } from './Order';
import type { PageCreateRestParams, PageSyncTableRestParams, PageUpdateRestParams } from './Page';
import type { ProductCreateRestParams, ProductSyncTableRestParams, ProductUpdateRestParams } from './Product';
import type { RedirectCreateRestParams, RedirectSyncTableRestParams, RedirectUpdateRestParams } from './Redirect';

import type { CollectSyncTableRestParams } from './Collect';
import type { CustomerCreateRestParams, CustomerSyncTableRestParams, CustomerUpdateRestParams } from './Customer';
import type { ShopSyncTableRestParams } from './Shop';
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
import { CustomerSyncTableType } from '../customers/customers-functions';
import { DraftOrderSyncTableType } from '../draftOrders/draftOrders-functions';
import { InventoryLevelSyncTableType } from '../inventoryLevels/inventoryLevels-functions';
import { OrderSyncTableType } from '../orders/orders-functions';
import { OrderLineItemSyncTableType } from '../orderLineItems/orderLineItems-functions';
import { PageSyncTableType } from '../pages/pages-functions';
import { RedirectSyncTableType } from '../redirects/redirects-functions';
import { ProductSyncTableType } from '../products/products-functions';
import { ProductVariantSyncTableType } from '../productVariants/productVariants-functions';
import { ProductVariantCreateRestParams, ProductVariantUpdateRestParams } from './ProductVariant';
import { ShopSyncTableType } from '../shop/shop-functions';
import { LocationSyncTableType } from '../locations/locations-functions';
import type { ResourceTypeUnion } from '../typesNew/allResources';

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
  | Collection.Params.Sync
  | CollectSyncTableRestParams
  | CustomerSyncTableRestParams
  | DraftOrderSyncTableRestParams
  | InventoryLevelSyncTableRestParams
  | OrderSyncTableRestParams
  | PageSyncTableRestParams
  | ProductSyncTableRestParams
  | ProductSyncTableRestParams
  | RedirectSyncTableRestParams
  | ShopSyncTableRestParams;

export type RestCreateParamsUnion =
  | Article.Params.Create
  | Blog.Params.Create
  | Collection.Params.Create
  | CustomerCreateRestParams
  | PageCreateRestParams
  | ProductCreateRestParams
  | ProductVariantCreateRestParams
  | RedirectCreateRestParams;

export type RestUpdateParamsUnion =
  | Article.Params.Update
  | Blog.Params.Update
  | Collection.Params.Update
  | CustomerUpdateRestParams
  | DraftOrderUpdateRestParams
  | OrderUpdateRestParams
  | PageUpdateRestParams
  | ProductUpdateRestParams
  | ProductVariantUpdateRestParams
  | RedirectUpdateRestParams;

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
