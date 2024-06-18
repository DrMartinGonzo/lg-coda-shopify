// #region Imports

import { ListInventoryItemsArgs } from '../../Clients/GraphQlClients';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_InventoryItems } from '../../coda/setup/inventoryItems-setup';
import { InventoryItemModel } from '../../models/graphql/InventoryItemModel';
import { updateCurrencyCodesInSchema } from '../../schemas/schema-utils';
import { InventoryItemSyncTableSchema } from '../../schemas/syncTable/InventoryItemSchema';
import { dateRangeMax, dateRangeMin, deepCopy } from '../../utils/helpers';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

// #region Types
export type SyncInventoryItemsParams = CodaSyncParams<typeof Sync_InventoryItems>;
// #endregion

export class SyncedInventoryItems extends AbstractSyncedGraphQlResources<InventoryItemModel> {
  public static staticSchema = InventoryItemSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    let augmentedSchema = deepCopy(this.staticSchema);
    augmentedSchema = await updateCurrencyCodesInSchema(augmentedSchema, context);

    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [createdAtRange, updatedAtRange, skus] = this.codaParams as SyncInventoryItemsParams;
    return {
      createdAtRange,
      updatedAtRange,
      skus,
    };
  }

  protected codaParamsToListArgs() {
    const { createdAtRange, updatedAtRange, skus } = this.codaParamsMap;
    return {
      createdAtMin: dateRangeMin(createdAtRange),
      createdAtMax: dateRangeMax(createdAtRange),
      updatedAtMin: dateRangeMin(updatedAtRange),
      updatedAtMax: dateRangeMax(updatedAtRange),
      skus,
    } as ListInventoryItemsArgs;
  }
}
