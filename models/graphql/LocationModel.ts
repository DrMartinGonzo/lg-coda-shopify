// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, idToGraphQlGid } from '../../graphql/utils/graphql-utils';

import { LocationClient } from '../../Clients/GraphQlClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { locationFragment } from '../../graphql/locations-graphql';
import { LocationRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { SupportedMetafieldOwnerResource } from '../rest/MetafieldModel';
import { GraphQlResourceNames, RestResourcesSingular } from '../../constants/resourceNames-constants';
import { BaseApiDataGraphQl } from './AbstractModelGraphQl';
import {
  AbstractModelGraphQlWithMetafields,
  BaseModelDataGraphQlWithMetafields,
} from './AbstractModelGraphQlWithMetafields';

// #endregion

// #region Types
export interface LocationApiData extends BaseApiDataGraphQl, ResultOf<typeof locationFragment> {}

export interface LocationModelData extends Omit<LocationApiData, 'metafields'>, BaseModelDataGraphQlWithMetafields {}
// #endregion

export class LocationModel extends AbstractModelGraphQlWithMetafields {
  public data: LocationModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Location;
  protected static readonly graphQlName = GraphQlResourceNames.Location;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Location;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Location;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: LocationRow) {
    let data: Partial<LocationModelData> = {
      address: {
        address1: row.address1,
        address2: row.address2,
        city: row.city,
        country: row.country,
        countryCode: row.country_code,
        phone: row.phone,
        province: row.province,
        provinceCode: row.province_code,
        zip: row.zip,
      },
      fulfillsOnlineOrders: row.fulfills_online_orders,
      hasActiveInventory: row.has_active_inventory,
      id: idToGraphQlGid(GraphQlResourceNames.Location, row.id),
      isActive: row.active,
      fulfillmentService: {
        handle: row.fulfillment_service,
        serviceName: undefined,
      },
      localPickupSettingsV2: row.local_pickup_settings as LocationModelData['localPickupSettingsV2'],
      name: row.name,
      shipsInventory: row.ships_inventory,
    };

    return LocationModel.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return LocationClient.createInstance(this.context);
  }

  public toCodaRow(): LocationRow {
    const { metafields, ...data } = this.data;

    let obj: Partial<LocationRow> = {
      id: this.restId,
      admin_graphql_api_id: this.graphQlGid,
      active: data.isActive,
      admin_url: `${this.context.endpoint}/admin/settings/locations/${this.restId}`,
      stock_url: `${this.context.endpoint}/admin/products/inventory?location_id=${this.restId}`,
      fulfillment_service: data.fulfillmentService?.handle,
      fulfills_online_orders: data.fulfillsOnlineOrders,
      has_active_inventory: data.hasActiveInventory,
      local_pickup_settings: data.localPickupSettingsV2,
      ships_inventory: data.shipsInventory,

      address1: data.address?.address1,
      address2: data.address?.address2,
      city: data.address?.city,
      country: data.address?.country,
      country_code: data.address?.countryCode,
      name: data.name,
      phone: data.address?.phone,
      province: data.address?.province,
      province_code: data.address?.provinceCode,
      zip: data.address?.zip,
    };

    if (metafields) {
      metafields.forEach((metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj as LocationRow;
  }
}
