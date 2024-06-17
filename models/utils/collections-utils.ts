// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { CollectionRow } from '../../schemas/CodaRows.types';
import { CustomCollectionModelData } from '../rest/CustomCollectionModel';
import { SmartCollectionModelData } from '../rest/SmartCollectionModel';

// #endregion

// #region Types
export interface CollectionModelData extends CustomCollectionModelData, SmartCollectionModelData {}
// #endregion

/**
 * Méthode partagée pour exporter en row un CustomCollectionModel ou un SmartCollectionModel
 */
export function collectionModelToCodaRow(
  context: coda.ExecutionContext,
  modelData: CollectionModelData
): CollectionRow {
  const { metafields, ...data } = modelData;

  let obj: CollectionRow = {
    ...data,
    admin_url: `${context.endpoint}/admin/collections/${data.id}`,
    body: striptags(data.body_html),
    published: !!data.published_at,
    disjunctive: data.disjunctive ?? false,
  };

  if (data.image) {
    obj.image_alt_text = data.image.alt;
    obj.image_url = data.image.src;
  }

  if (metafields) {
    metafields.forEach((metafield) => {
      obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
    });
  }

  return obj as CollectionRow;
}
