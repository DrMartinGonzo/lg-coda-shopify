// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CUSTOM_FIELD_PREFIX_KEY } from '../../../constants';
import { arrayUnique, isNullOrEmpty } from '../../../utils/helpers';
import { METAFIELD_TYPES_RAW_REFERENCE } from '../Metafield.types';
import { BaseRow } from '../../../schemas/CodaRows.types';
import { separatePrefixedMetafieldsKeysFromKeys } from './metafields-utils-keys';

// #region Helpers
/**
 * Wether an update triggered by a 2-way sync table has metafields in it.
 */
export function hasMetafieldsInUpdates(
  updates: Array<coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>>
) {
  return updates.map((update) => hasMetafieldsInUpdate(update)).some(Boolean);
}

/**
 * Wether an update triggered by a 2-way sync table has metafields in it.
 */
export function hasMetafieldsInUpdate(
  update: coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>
) {
  return update.updatedFields.some((fromKey) => fromKey.startsWith(CUSTOM_FIELD_PREFIX_KEY));
}

export function hasMetafieldsInRow(row: BaseRow) {
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(Object.keys(row));
  return prefixedMetafieldFromKeys.length > 0;
}

/**
 * Metafields should be deleted if their string value is empty of contains an empty JSON.stringified array
 */
export function shouldDeleteMetafield(string: string) {
  return isNullOrEmpty(string) || string === '[]';
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
