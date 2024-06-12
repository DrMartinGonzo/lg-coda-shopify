// #region Imports

import { ListInventoryItemsArgs } from '../../Clients/GraphQlApiClientBase';
import { GetSchemaArgs } from '../../Resources/Abstract/AbstractResource';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_InventoryItems } from '../../coda/setup/inventoryItems-setup';
import { InventoryItemModel } from '../../models/graphql/InventoryItemModel';
import { updateCurrencyCodesInSchemaNew } from '../../schemas/schema-utils';
import { InventoryItemSyncTableSchema } from '../../schemas/syncTable/InventoryItemSchema';
import { dateRangeMax, dateRangeMin, deepCopy } from '../../utils/helpers';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

export class SyncedInventoryItems extends AbstractSyncedGraphQlResources<InventoryItemModel> {
  public static staticSchema = InventoryItemSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    let augmentedSchema = deepCopy(this.staticSchema);
    augmentedSchema = await updateCurrencyCodesInSchemaNew(augmentedSchema, context);

    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [createdAtRange, updatedAtRange, skus] = this.codaParams as CodaSyncParams<typeof Sync_InventoryItems>;
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
