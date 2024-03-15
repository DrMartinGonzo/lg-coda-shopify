import type { GraphQlResourceName } from './ShopifyGraphQlResourceTypes';

import type { articleResource } from '../resources/allResources';
import type { blogResource } from '../resources/allResources';
import type { collectionResource } from '../resources/allResources';
import type { collectResource } from '../resources/allResources';
import type { customCollectionResource } from '../resources/allResources';
import type { customerResource } from '../resources/allResources';
import type { draftOrderResource } from '../resources/allResources';
import type { inventoryLevelResource } from '../resources/allResources';
import type { locationResource } from '../resources/allResources';
import type { orderLineItemResource } from '../resources/allResources';
import type { orderResource } from '../resources/allResources';
import type { pageResource } from '../resources/allResources';
import type { productResource } from '../resources/allResources';
import type { productVariantResource } from '../resources/allResources';
import type { redirectResource } from '../resources/allResources';
import type { shopResource } from '../resources/allResources';
import type { smartCollectionResource } from '../resources/allResources';
import type { MetafieldOwnerType } from './generated/admin.types';

export interface BaseSyncTableRestParams {
  limit?: number;
}

export type ResourceTypeUnion =
  | typeof articleResource
  | typeof blogResource
  | typeof collectionResource
  | typeof customCollectionResource
  | typeof smartCollectionResource
  | typeof collectResource
  | typeof customerResource
  | typeof draftOrderResource
  | typeof inventoryLevelResource
  | typeof locationResource
  | typeof orderResource
  | typeof orderLineItemResource
  | typeof pageResource
  | typeof productResource
  | typeof productVariantResource
  | typeof redirectResource
  | typeof shopResource;

export type ResourceTypeGraphQlUnion = Extract<ResourceTypeUnion, { graphQl: { name: GraphQlResourceName } }>;
export type HasMetafieldSyncTableResourceTypeUnion = Extract<
  ResourceTypeUnion,
  { hasMetafieldSyncTable: true; metafieldOwnerType: MetafieldOwnerType }
>;
export type SupportMetafieldDefinitionsResourceTypeUnion = Extract<
  ResourceTypeUnion,
  { supportMetafieldDefinitions: true; metafieldOwnerType: MetafieldOwnerType }
>;
