// #region Imports
import * as coda from '@codahq/packs-sdk';

import { UnsupportedValueError } from '../../../Errors';
import { ResourceName } from '../../../Fetchers/NEW/AbstractResource';
import { SupportedMetafieldOwnerResource } from '../../../Fetchers/NEW/Resources/Metafield';
import { SupportedMetafieldOwnerType } from '../../../Fetchers/NEW/Resources/MetafieldGraphQl';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { isNullishOrEmpty } from '../../../utils/helpers';
import { GraphQlResourceName } from '../../ShopifyResource.types';
import { METAFIELD_TYPES_RAW_REFERENCE } from '../Metafield.types';
import { hasMetafieldsInUpdate } from '../../../Fetchers/NEW/abstractResource-utils';

// #region Helpers
/**
 * Wether an update triggered by a 2-way sync table has metafields in it.
 */
function hasMetafieldsInUpdates(
  updates: Array<coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>>
) {
  return updates.map((update) => hasMetafieldsInUpdate(update)).some(Boolean);
}

/**
 * Metafields should be deleted if their string value is empty of contains an empty JSON.stringified array
 */
export function shouldDeleteMetafield(string: string) {
  return isNullishOrEmpty(string) || string === '[]';
}

/**
 * Determine if a table cell value derived from a metafield ot metaobject field
 * value should be updated or not.
 * They are updatable if the value is not a reference to another resource
 * (except for references in METAFIELD_TYPES_RAW_REFERENCE, wich uses raw text
 * columns), or if is, it should not come from an action using `coda.withIdentity`
 * This is to prevent breaking existing relations when using `coda.withIdentity`.
 *
 * @param fieldType the type of the field definition
 * @param schemaWithIdentity wether the data will be consumed by an action wich result use a `coda.withIdentity` schema.
 * @returns `true` if the value should be updated
 */
export function shouldUpdateSyncTableMetafieldValue(fieldType: string, schemaWithIdentity = false): boolean {
  const isReference = fieldType.indexOf('_reference') !== -1;
  const shouldUpdateReference =
    !schemaWithIdentity || (schemaWithIdentity && METAFIELD_TYPES_RAW_REFERENCE.includes(fieldType as any));

  return !isReference || (isReference && shouldUpdateReference);
}

/**
 * Matches a GraphQl MetafieldOwnerType to the corresponding GraphQL resource name.
 *
 * @param {MetafieldOwnerType} ownerType - the MetafieldOwnerType to match
 * @return {GraphQlResourceName} the corresponding GraphQL resource name
 */
export function matchOwnerTypeToResourceName(ownerType: MetafieldOwnerType): GraphQlResourceName {
  switch (ownerType) {
    case MetafieldOwnerType.Article:
      return GraphQlResourceName.OnlineStoreArticle;
    case MetafieldOwnerType.Blog:
      return GraphQlResourceName.OnlineStoreBlog;
    case MetafieldOwnerType.Collection:
      return GraphQlResourceName.Collection;
    case MetafieldOwnerType.Customer:
      return GraphQlResourceName.Customer;
    case MetafieldOwnerType.Draftorder:
      return GraphQlResourceName.DraftOrder;
    case MetafieldOwnerType.Location:
      return GraphQlResourceName.Location;
    case MetafieldOwnerType.Order:
      return GraphQlResourceName.Order;
    case MetafieldOwnerType.Page:
      return GraphQlResourceName.OnlineStorePage;
    case MetafieldOwnerType.Product:
      return GraphQlResourceName.Product;
    case MetafieldOwnerType.Productvariant:
      return GraphQlResourceName.ProductVariant;
    case MetafieldOwnerType.Shop:
      return GraphQlResourceName.Shop;

    default:
      throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
  }
}

/**
 * Matches a GraphQl MetafieldOwnerType to the corresponding Rest owner resource name.
 *
 * @param {MetafieldOwnerType} ownerType - the MetafieldOwnerType to match
 * @return {GraphQlResourceName} the corresponding Rest owner resource name
 */
export function matchOwnerTypeToOwnerResource(ownerType: MetafieldOwnerType): SupportedMetafieldOwnerResource {
  switch (ownerType) {
    case MetafieldOwnerType.Article:
      return 'article';
    case MetafieldOwnerType.Blog:
      return 'blog';
    case MetafieldOwnerType.Collection:
      return 'collection';
    case MetafieldOwnerType.Customer:
      return 'customer';
    case MetafieldOwnerType.Draftorder:
      return 'draft_order';
    case MetafieldOwnerType.Location:
      return 'location';
    case MetafieldOwnerType.Order:
      return 'order';
    case MetafieldOwnerType.Page:
      return 'page';
    case MetafieldOwnerType.Product:
      return 'product';
    case MetafieldOwnerType.Productvariant:
      return 'variant';
    case MetafieldOwnerType.Shop:
      return 'shop';

    default:
      throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
  }
}

/**
 * Matches a Rest owner resource name to the corresponding GraphQl MetafieldOwnerType.
 *
 * @param {ResourceName} ownerResource - the Rest owner resource name
 * @return {SupportedMetafieldOwnerType} the corresponding GraphQl MetafieldOwnerType
 */
export function matchOwnerResourceToMetafieldOwnerType(ownerResource: ResourceName): SupportedMetafieldOwnerType {
  switch (ownerResource) {
    case 'article':
      return MetafieldOwnerType.Article;
    case 'blog':
      return MetafieldOwnerType.Blog;
    case 'collection':
      return MetafieldOwnerType.Collection;
    case 'customer':
      return MetafieldOwnerType.Customer;
    case 'draft_order':
      return MetafieldOwnerType.Draftorder;
    case 'location':
      return MetafieldOwnerType.Location;
    case 'order':
      return MetafieldOwnerType.Order;
    case 'page':
      return MetafieldOwnerType.Page;
    case 'product':
      return MetafieldOwnerType.Product;
    case 'variant':
      return MetafieldOwnerType.Productvariant;
    case 'shop':
      return MetafieldOwnerType.Shop;

    default:
      throw new UnsupportedValueError('OwnerResource', ownerResource);
  }
}
