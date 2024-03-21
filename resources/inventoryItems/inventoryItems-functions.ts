import * as coda from '@codahq/packs-sdk';
import { readFragment } from '../../utils/graphql';

import { InventoryItemRow } from '../../schemas/CodaRows.types';
import { InventoryItemGraphQlFetcher } from './InventoryItemGraphQlFetcher';
import { InventoryItemFieldsFragment } from './inventoryItems-graphql';

// #region Helpers
export async function handleInventoryItemUpdateJob(
  row: {
    original?: InventoryItemRow;
    updated: InventoryItemRow;
  },
  context: coda.ExecutionContext
) {
  let obj = row.original ?? ({} as InventoryItemRow);

  const inventoryItemsFetcher = new InventoryItemGraphQlFetcher(context);
  const inventoryItemUpdateVariables = inventoryItemsFetcher.formatRowToApi(row.updated);

  if (inventoryItemUpdateVariables) {
    const updateJob = await inventoryItemsFetcher.update(inventoryItemUpdateVariables);
    if (updateJob?.body?.data?.inventoryItemUpdate?.inventoryItem) {
      const inventoryItem = readFragment(
        InventoryItemFieldsFragment,
        updateJob.body.data.inventoryItemUpdate.inventoryItem
      );
      obj = {
        ...obj,
        ...inventoryItemsFetcher.formatApiToRow(inventoryItem),
      };
    }
  }

  return obj;
}
// #endregion
