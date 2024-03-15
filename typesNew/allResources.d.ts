import type { GraphQlResourceName } from './ShopifyGraphQlResourceTypes';

import type { articleResource } from '../allResources';
import type { blogResource } from '../allResources';
import type { collectionResource } from '../allResources';
import type { collectResource } from '../allResources';
import type { customCollectionResource } from '../allResources';
import type { customerResource } from '../allResources';
import type { draftOrderResource } from '../allResources';
import type { inventoryLevelResource } from '../allResources';
import type { locationResource } from '../allResources';
import type { orderLineItemResource } from '../allResources';
import type { orderResource } from '../allResources';
import type { pageResource } from '../allResources';
import type { productResource } from '../allResources';
import type { productVariantResource } from '../allResources';
import type { redirectResource } from '../allResources';
import type { shopResource } from '../allResources';
import type { smartCollectionResource } from '../allResources';
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
