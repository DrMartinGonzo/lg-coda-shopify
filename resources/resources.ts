// #region Imports
import { articleResource } from './articles/articleResource';
import { blogResource } from './blogs/blogResource';
import { collectionResource } from './collections/collectionResource';
import { customCollectionResource } from './collections/custom_collection/customCollectionResource';
import { smartCollectionResource } from './collections/smart_collection/smartCollectionResource';
import { collectResource } from './collects/collectResource';
import { customerResource } from './customers/customerResource';
import { draftOrderResource } from './draftOrders/draftOrder';
import { inventoryLevelResource } from './inventoryLevels/inventoryLevelResource';
import { locationResource } from './locations/locationResource';
import { orderLineItemResource } from './orderLineItems/orderLineItemResource';
import { orderResource } from './orders/orderResource';
import { pageResource } from './pages/pageResource';
import { productResource } from './products/productResource';
import { productVariantResource } from './productVariants/productVariantResource';
import { redirectResource } from './redirects/redirectResource';
import { shopResource } from './shop/shopResource';

import { GraphQlResourceName } from '../Fetchers/ShopifyGraphQlResource.types';
import { MetafieldOwnerType } from '../types/admin.types';
import { ResourceWithMetafields, ResourceWithMetafieldDefinitions } from './Resource.types';

// #endregion

const resources = [
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
export const getResourcesWithMetaFieldsSyncTable = (): ResourceWithMetafields<any, any>[] =>
  resources.filter(
    (resource) => 'metafields' in resource && resource.metafields.hasSyncTable === true
  ) as ResourceWithMetafields<any, any>[];

export const getResourcesWithMetaFieldDefinitions = (): ResourceWithMetafieldDefinitions<any, any>[] =>
  resources.filter(
    (resource) => 'metafields' in resource && resource.metafields.supportsDefinitions === true
  ) as ResourceWithMetafieldDefinitions<any, any>[];

// export function getSingleResourceByGraphQlName(graphQlName: GraphQlResourceName): Resource<any> {
//   return resources.find((resource) => resource.graphQl.name === graphQlName) as Resource<any>;
// }

export function requireResourceWithDefinedMetaFieldsByGraphQlName(
  graphQlName: GraphQlResourceName
): ResourceWithMetafields<any, any> {
  const definition = resources.find(
    (resource) =>
      resource.graphQl.name === graphQlName &&
      'metafields' in resource &&
      resource.metafields.supportsDefinitions === true
  ) as ResourceWithMetafields<any, any>;
  if (!definition) {
    throw new Error(`GraphQl resource ${graphQlName} not found or has no metafieldOwnerType`);
  }
  return definition;
}

export function requireResourceWithMetaFieldsByOwnerType(
  metafieldOwnerType: MetafieldOwnerType
): ResourceWithMetafields<any, any> {
  const definition = resources.find(
    (resource) => 'metafields' in resource && resource.metafields.ownerType === metafieldOwnerType
  ) as ResourceWithMetafields<any, any>;
  if (!definition) {
    throw new Error('Unknown MetafieldOwnerType: ' + MetafieldOwnerType);
  }
  return definition;
}
