// #region Imports

import { ListLocationsArgs, LocationFieldsArgs } from '../../Clients/GraphQlApiClientBase';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_Locations } from '../../coda/setup/locations-setup';
import { LocationModel } from '../../models/graphql/LocationModel';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { LocationSyncTableSchema } from '../../schemas/syncTable/LocationSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy } from '../../utils/helpers';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

export class SyncedLocations extends AbstractSyncedGraphQlResources<LocationModel> {
  public static staticSchema = LocationSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Locations>;
    let augmentedSchema = deepCopy(this.staticSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, MetafieldOwnerType.Location, context);
    }
    // @ts-expect-error: admin_url and stock_url should always be the last featured properties, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties = [...augmentedSchema.featuredProperties, 'admin_url', 'stock_url'];
    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [syncMetafields] = this.codaParams as CodaSyncParams<typeof Sync_Locations>;
    return { syncMetafields };
  }

  // protected async sync() {
  //   return (this.client as LocationClient).listByOwnerType(this.getListParams());
  // }

  /**
   * Only request the minimum required fields for the owner
   */
  protected codaParamsToListArgs() {
    const fields: LocationFieldsArgs = { metafields: this.shouldSyncMetafields };
    ['fulfillment_service', 'local_pickup_settings'].forEach((key) => {
      fields[key] = this.effectiveStandardFromKeys.includes(key);
    });

    return {
      fields,
      metafieldKeys: this.effectiveMetafieldKeys,
    } as ListLocationsArgs;
  }
}
