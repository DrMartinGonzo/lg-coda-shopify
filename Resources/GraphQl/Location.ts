// #region Imports
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { SyncTableManagerGraphQlWithMetafieldsType } from '../../SyncTableManager/GraphQl/SyncTableManagerGraphQl';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { MakeSyncFunctionArgs, SyncGraphQlFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Locations } from '../../coda/setup/locations-setup';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT, Identity, PACK_IDENTITIES } from '../../constants';
import {
  activateLocationMutation,
  deactivateLocationMutation,
  editLocationMutation,
  getLocationsQuery,
  getSingleLocationQuery,
  locationFragment,
} from '../../graphql/locations-graphql';
import { LocationRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../schemas/schema-utils';
import { LocationSyncTableSchema } from '../../schemas/syncTable/LocationSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { deepCopy, excludeUndefinedObjectKeys } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import {
  FindAllGraphQlResponse,
  GraphQlApiDataWithMetafields,
  GraphQlResourcePath,
  SaveArgs,
} from '../Abstract/GraphQl/AbstractGraphQlResource';
import { AbstractGraphQlResourceWithMetafields } from '../Abstract/GraphQl/AbstractGraphQlResourceWithMetafields';
import { Metafield, SupportedMetafieldOwnerResource } from '../Rest/Metafield';
import { BaseContext, FromRow } from '../types/Resource.types';
import { GraphQlResourceNames, RestResourcesSingular } from '../types/SupportedResource';

// #endregion

// #region Types
interface FieldsArgs {
  metafields?: boolean;
  fulfillment_service?: boolean;
  local_pickup_settings?: boolean;
}
interface FindArgs extends BaseContext {
  id: string;
  fields?: FieldsArgs;
  metafieldKeys?: Array<string>;
}
interface DeleteArgs extends BaseContext {
  ids: Array<string>;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  limit?: number;
  cursor?: string;
  fields?: FieldsArgs;
  metafieldKeys?: Array<string>;
}
// #endregion

export class Location extends AbstractGraphQlResourceWithMetafields {
  public apiData: ResultOf<typeof locationFragment> & GraphQlApiDataWithMetafields;

  public static readonly displayName: Identity = PACK_IDENTITIES.Location;
  protected static readonly graphQlName = GraphQlResourceNames.Location;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Location;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Location;

  protected static readonly paths: Array<GraphQlResourcePath> = [
    'node',
    'location',
    'locations',
    'locationEdit.location',
  ];

  public static getStaticSchema() {
    return LocationSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Locations>;
    let augmentedSchema = deepCopy(this.getStaticSchema());
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, this.metafieldGraphQlOwnerType, context);
    }
    // @ts-expect-error: admin_url and stock_url should always be the last featured properties, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties = [...augmentedSchema.featuredProperties, 'admin_url', 'stock_url'];
    return augmentedSchema;
  }

  public static makeSyncTableManagerSyncFunction({
    context,
    syncTableManager,
  }: MakeSyncFunctionArgs<
    typeof Sync_Locations,
    SyncTableManagerGraphQlWithMetafieldsType<Location>
  >): SyncGraphQlFunction<Location> {
    const fields: AllArgs['fields'] = {
      metafields: syncTableManager.shouldSyncMetafields,
    };

    ['fulfillment_service', 'local_pickup_settings'].forEach((key) => {
      fields[key] = syncTableManager.effectiveStandardFromKeys.includes(key);
    });

    return ({ cursor = null, limit }) =>
      this.all({
        context,
        fields,
        metafieldKeys: syncTableManager.effectiveMetafieldKeys,
        cursor,
        limit,
        options: { cacheTtlSecs: CACHE_DISABLED },
      });
  }

  public static async find({ id, fields = {}, context, options }: FindArgs): Promise<Location | null> {
    const result = await this.baseFind<Location, typeof getSingleLocationQuery>({
      documentNode: getSingleLocationQuery,
      variables: {
        id,

        includeMetafields: fields?.metafields ?? true,
        includeFulfillmentService: fields?.fulfillment_service ?? true,
        includeLocalPickupSettings: fields?.local_pickup_settings ?? true,
        countMetafields: 0,
        metafieldKeys: [],
      } as VariablesOf<typeof getSingleLocationQuery>,
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  // public static async delete({ ids, context, options }: DeleteArgs) {
  //   return this.baseDelete<typeof deleteLocationsMutation>({
  //     documentNode: deleteLocationsMutation,
  //     variables: {
  //       fileIds: ids,
  //     },
  //     context,
  //     options,
  //   });
  // }

  public static async all({
    context,
    limit = null,
    cursor = null,
    fields = {},
    metafieldKeys = [],
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllGraphQlResponse<Location>> {
    let searchQuery = '';

    const response = await this.baseFind<Location, typeof getLocationsQuery>({
      documentNode: getLocationsQuery,
      variables: {
        limit: limit ?? GRAPHQL_NODES_LIMIT,
        cursor,
        searchQuery,

        includeMetafields: fields?.metafields ?? true,
        includeFulfillmentService: fields?.fulfillment_service ?? true,
        includeLocalPickupSettings: fields?.local_pickup_settings ?? true,
        countMetafields: metafieldKeys.length,
        metafieldKeys,

        ...otherArgs,
      } as VariablesOf<typeof getLocationsQuery>,
      context,
      options,
    });

    return response;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async activate(): Promise<void> {
    const documentNode = activateLocationMutation;
    const variables = {
      locationId: this.graphQlGid,
    } as VariablesOf<typeof documentNode>;

    const response = await this.request<typeof documentNode>({
      context: this.context,
      documentNode: documentNode,
      variables: variables,
    });

    if (response.body.data.locationActivate?.location) {
      this.setData({ ...this.apiData, ...response.body.data.locationActivate.location });
    }
  }

  public async deActivate(destinationId?: string): Promise<void> {
    const documentNode = deactivateLocationMutation;
    const variables = {
      locationId: this.graphQlGid,
      destinationLocationId: destinationId,
    } as VariablesOf<typeof documentNode>;

    const response = await this.request<typeof documentNode>({
      context: this.context,
      documentNode: documentNode,
      variables: variables,
    });

    if (response.body.data.locationDeactivate?.location) {
      this.setData({ ...this.apiData, ...response.body.data.locationDeactivate.location });
    }
  }

  public async save({ update = false }: SaveArgs): Promise<void> {
    const input = this.formatLocationEditInput();

    if (input) {
      const documentNode = editLocationMutation;
      const variables = {
        id: this.graphQlGid,
        input,

        includeMetafields: false,
        includeLocalPickupSettings: false,
        includeFulfillmentService: false,
      } as VariablesOf<typeof documentNode>;

      await this._baseSave<typeof documentNode>({ documentNode, variables, update });
    }
  }

  formatLocationEditInput(): VariablesOf<typeof editLocationMutation>['input'] | undefined {
    let input: VariablesOf<typeof editLocationMutation>['input'] = {
      name: this.apiData.name,
      address: this.apiData.address as VariablesOf<typeof editLocationMutation>['input']['address'],
    };
    const filteredInput = excludeUndefinedObjectKeys({
      ...input,
      address: excludeUndefinedObjectKeys(input.address),
    });

    // If no input, we have nothing to update.
    return Object.keys(filteredInput).length === 0 ? undefined : filteredInput;
  }

  protected formatToApi({ row, metafields }: FromRow<LocationRow>) {
    let apiData: Partial<typeof this.apiData> = {
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
      id: row.id ? idToGraphQlGid(GraphQlResourceNames.Location, row.id) : undefined,
      isActive: row.active,
      fulfillmentService: {
        handle: row.fulfillment_service,
        serviceName: undefined,
      },
      localPickupSettingsV2: row.local_pickup_settings as (typeof this.apiData)['localPickupSettingsV2'],
      name: row.name,
      shipsInventory: row.ships_inventory,

      restMetafieldInstances: metafields,
    };

    return apiData;
  }

  public formatToRow(): LocationRow {
    const { apiData: data } = this;

    let obj: LocationRow = {
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

    if (data.restMetafieldInstances) {
      data.restMetafieldInstances.forEach((metafield: Metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
