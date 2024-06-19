// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, idToGraphQlGid } from '../../graphql/utils/graphql-utils';

import { LocationClient } from '../../Clients/GraphQlClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames, RestResourcesSingular } from '../../constants/resourceNames-constants';
import { locationFragment } from '../../graphql/locations-graphql';
import { LocationRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { SupportedMetafieldOwnerResource } from '../rest/MetafieldModel';
import { formatMetafieldsForOwnerRow } from '../utils/metafields-utils';
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

  public static createInstanceFromRow(
    context: coda.ExecutionContext,
    { address1, address2, city, country, country_code, phone, province, province_code, zip, ...row }: LocationRow
  ) {
    let data: Partial<LocationModelData> = {
      address: {
        address1,
        address2,
        city,
        country,
        countryCode: country_code,
        phone,
        province,
        provinceCode: province_code,
        zip,
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
    const { metafields = [], address, ...data } = this.data;

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

      address1: address?.address1,
      address2: address?.address2,
      city: address?.city,
      country: address?.country,
      country_code: address?.countryCode,
      name: data.name,
      phone: address?.phone,
      province: address?.province,
      province_code: address?.provinceCode,
      zip: address?.zip,
      ...formatMetafieldsForOwnerRow(metafields),
    };

    return obj as LocationRow;
  }
}
