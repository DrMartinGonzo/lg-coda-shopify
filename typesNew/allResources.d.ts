import type { GraphQlResourceName } from '../types/RequestsGraphQl';

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
import type { shopVariantResource } from '../allResources';
import type { smartCollectionResource } from '../allResources';

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
  | typeof shopVariantResource;

export type ResourceTypeGraphQlUnion = Extract<ResourceTypeUnion, { graphQl: { name: GraphQlResourceName } }>; // Results in { id: number }
