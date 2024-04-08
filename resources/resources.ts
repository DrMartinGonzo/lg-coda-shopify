// #region Imports
import { MetafieldOwnerType } from '../types/admin.types';

import { ResourceWithMetafieldDefinitions, ResourceWithMetafields } from './Resource.types';
import { draftOrderResource } from './draftOrders/draftOrderResource';
import { locationResource } from './locations/locationResource';
import { orderLineItemResource } from './orderLineItems/orderLineItemResource';
import { orderResource } from './orders/orderResource';

// #endregion

const resources = [draftOrderResource, locationResource, orderResource, orderLineItemResource];

// #region Helpers
export const getResourcesWithMetaFieldsSyncTable = (): ResourceWithMetafields<any, any>[] =>
  resources.filter(
    (resource) => 'metafields' in resource && resource.metafields.hasSyncTable === true
  ) as ResourceWithMetafields<any, any>[];

export const getResourcesWithMetaFieldDefinitions = (): ResourceWithMetafieldDefinitions<any, any>[] =>
  resources.filter(
    (resource) => 'metafields' in resource && resource.metafields.supportsDefinitions === true
  ) as ResourceWithMetafieldDefinitions<any, any>[];

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
