// #region Imports
import * as coda from '@codahq/packs-sdk';

import { BaseRow } from '../../schemas/CodaRows.types';
import { isPrefixedMetaFieldKey } from '../../utils/metafields-utils';

export function handleDeleteNotFound(path: string | string) {
  console.error(`Not found at path : '${path}'. Possibly already deleted.`);
}

/**
 * Wether an update triggered by a 2-way sync table has metafields in it.
 */
export function hasMetafieldsInUpdate(
  update: coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>
) {
  return update.updatedFields.some((fromKey) => isPrefixedMetaFieldKey(fromKey));
}

export function hasMetafieldsInRow(row: BaseRow) {
  return Object.keys(row).some((fromKey) => isPrefixedMetaFieldKey(fromKey));
}
