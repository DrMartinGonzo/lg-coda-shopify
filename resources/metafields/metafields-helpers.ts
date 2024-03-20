import * as coda from '@codahq/packs-sdk';

import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { REST_DEFAULT_API_VERSION } from '../../config/config';
import { CUSTOM_FIELD_PREFIX_KEY } from '../../constants';
import { arrayUnique } from '../../utils/helpers';
import { ResourceWithMetafields } from '../Resource.types';
import { METAFIELD_TYPES_RAW_REFERENCE } from './metafields-constants';

// #region Helpers
/**
 * Wether an update triggered by a 2-way sync table has metafields in it.
 */
export function hasMetafieldsInUpdates(
  updates: Array<coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>>
) {
  const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
  return allUpdatedFields.some((fromKey) => fromKey.startsWith(CUSTOM_FIELD_PREFIX_KEY));
}

/**
 * Metafields should be deleted if their string value is empty of contains an empty JSON.stringified array
 */
export function shouldDeleteMetafield(string: string) {
  return string === null || string === undefined || string === '' || string === '[]';
}

export function getResourceMetafieldsRestApiUrl(
  context: coda.ExecutionContext,
  ownerId: number,
  ownerResource: ResourceWithMetafields<any, any>
) {
  return `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/${ownerResource.rest.plural}/${ownerId}/metafields.json`;
}
export function getResourceMetafieldsAdminUrl(
  context: coda.ExecutionContext,
  restResource: ResourceWithMetafields<any, any>,
  hasMetafieldDefinition: boolean,
  ownerId: number,
  parentOwnerId?: number
) {
  let admin_url: string;
  const { singular, plural } = restResource.rest;

  switch (singular) {
    case RestResourceSingular.Article:
    case RestResourceSingular.Blog:
    case RestResourceSingular.Collection:
    case RestResourceSingular.Customer:
    case RestResourceSingular.Order:
    case RestResourceSingular.Page:
    case RestResourceSingular.Product:
      admin_url = `${context.endpoint}/admin/${plural}/${ownerId}/metafields`;
      break;

    case RestResourceSingular.Location:
      admin_url = `${context.endpoint}/admin/settings/${plural}/${ownerId}/metafields`;
      break;

    case RestResourceSingular.ProductVariant:
      if (parentOwnerId) {
        admin_url = `${context.endpoint}/admin/${RestResourcePlural.Product}/${parentOwnerId}/${plural}/${ownerId}/metafields`;
      }
      break;

    default:
      break;
  }
  if (admin_url && !hasMetafieldDefinition) {
    admin_url += `/unstructured`;
  }
  return admin_url;
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
// #endregion

// #region Metafield key functions
/**
 * This function checks if a given metafield key is the 'full' one or not.
 * When querying metafields via their keys, GraphQl returns the 'full' key, i.e. `${namespace}.${key}`.
 */
const hasMetafieldFullKey = (metafield: { namespace: string; key: string }) =>
  metafield.key.indexOf(metafield.namespace) === 0;

/**
 * A naive way to check if any of the keys might be a metafield key
 */
function maybeHasMetaFieldKeys(keys: string[]) {
  return keys.some((key) => key.indexOf('.') !== -1);
}

export function getMetaFieldFullKey(m: { namespace: string; key: string }): string {
  if (hasMetafieldFullKey(m)) return m.key as string;
  return `${m.namespace}.${m.key}`;
}

export const splitMetaFieldFullKey = (fullKey: string) => {
  const lastDotIndex = fullKey.lastIndexOf('.');
  if (lastDotIndex === -1) {
    throw new Error(`Not a metafield full key: ${fullKey}`);
  }

  return {
    metaKey: fullKey.substring(lastDotIndex + 1),
    metaNamespace: fullKey.substring(0, lastDotIndex),
  };
};

/**
 * Prepend a custom prefix to the metafield key
 * This allows us to detect if a coda column key is a metafield column to handle updates
 */
export function preprendPrefixToMetaFieldKey(fullKey: string) {
  return CUSTOM_FIELD_PREFIX_KEY + fullKey;
}

/**
 * Remove our custom prefix from the metafield key
 */
export function removePrefixFromMetaFieldKey(fromKey: string) {
  return fromKey.replace(CUSTOM_FIELD_PREFIX_KEY, '');
}

/**
 * Differentiate between the metafields columns and the standard columns from
 * the effective columns keys that we can get when coda does an update or
 * perform a sync table request.
 */
export function separatePrefixedMetafieldsKeysFromKeys(fromKeys: string[]) {
  const prefixedMetafieldFromKeys = fromKeys.filter((fromKey) => fromKey.startsWith(CUSTOM_FIELD_PREFIX_KEY));
  const standardFromKeys = fromKeys.filter((fromKey) => prefixedMetafieldFromKeys.indexOf(fromKey) === -1);

  return { prefixedMetafieldFromKeys, standardFromKeys };
}
// #endregion
