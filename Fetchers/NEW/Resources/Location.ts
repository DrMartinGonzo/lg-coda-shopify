// #region Imports
import { ResultOf, VariablesOf } from '../../../utils/graphql';

import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT } from '../../../constants';
import { idToGraphQlGid } from '../../../helpers-graphql';
import { GraphQlResourceName, RestResourceSingular } from '../../../resources/ShopifyResource.types';
import { Sync_Locations } from '../../../resources/locations/locations-coda';
import {
  activateLocationMutation,
  deactivateLocationMutation,
  editLocationMutation,
  getLocationsQuery,
  getSingleLocationQuery,
  locationFragment,
} from '../../../resources/locations/locations-graphql';
import { LocationRow } from '../../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields } from '../../../schemas/schema-helpers';
import { LocationSyncTableSchema } from '../../../schemas/syncTable/LocationSchema';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { deepCopy, deleteUndefinedInObject } from '../../../utils/helpers';
import {
  AbstractGraphQlResource_Synced_HasMetafields,
  FindAllResponse,
  GraphQlApiDataWithMetafields,
  GraphQlResourcePath,
  MakeSyncFunctionArgsGraphQl,
  SaveArgs,
  SyncFunctionGraphQl,
} from '../AbstractGraphQlResource';
import { BaseContext, ResourceDisplayName } from '../AbstractResource';
import { CodaSyncParams, FromRow, GetSchemaArgs } from '../AbstractResource_Synced';
import { Metafield, RestMetafieldOwnerType } from './Metafield';

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
  maxEntriesPerRun?: number;
  cursor?: string;
  fields?: FieldsArgs;
  metafieldKeys?: Array<string>;
}
// #endregion

export class Location extends AbstractGraphQlResource_Synced_HasMetafields {
  public apiData: ResultOf<typeof locationFragment> & GraphQlApiDataWithMetafields;

  static readonly displayName = 'Location' as ResourceDisplayName;
  protected static paths: Array<GraphQlResourcePath> = ['node', 'location', 'locations.nodes', 'locationEdit.location'];
  static readonly metafieldRestOwnerType: RestMetafieldOwnerType = 'location';
  protected static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Location;

  public static getStaticSchema() {
    return LocationSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Locations>;
    let augmentedSchema = deepCopy(this.getStaticSchema());
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, this.metafieldGraphQlOwnerType, context);
    }
    // @ts-ignore: admin_url and stock_url should always be the last featured properties, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties = [...augmentedSchema.featuredProperties, 'admin_url', 'stock_url'];
    return augmentedSchema;
  }

  protected static makeSyncFunction({
    context,
    syncTableManager,
  }: MakeSyncFunctionArgsGraphQl<Location, typeof Sync_Locations>): SyncFunctionGraphQl {
    const fields: AllArgs['fields'] = {
      metafields: syncTableManager.shouldSyncMetafields,
    };

    ['fulfillment_service', 'local_pickup_settings'].forEach((key) => {
      fields[key] = syncTableManager.effectiveStandardFromKeys.includes(key);
    });

    return ({ cursor = null, maxEntriesPerRun }) =>
      this.all({
        context,
        fields,
        metafieldKeys: syncTableManager.effectiveMetafieldKeys,
        cursor,
        maxEntriesPerRun,
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
    maxEntriesPerRun = null,
    cursor = null,
    fields = {},
    metafieldKeys = [],
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Location>> {
    let searchQuery = '';

    const response = await this.baseFind<Location, typeof getLocationsQuery>({
      documentNode: getLocationsQuery,
      variables: {
        maxEntriesPerRun: maxEntriesPerRun ?? GRAPHQL_NODES_LIMIT,
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
      this.apiData = { ...this.apiData, ...response.body.data.locationActivate.location };
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
      this.apiData = { ...this.apiData, ...response.body.data.locationDeactivate.location };
    }
  }

  public async save({ update = false }: SaveArgs): Promise<void> {
    const documentNode = editLocationMutation;
    const input = this.formatLocationEditInput();

    if (input) {
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

    input.address = deleteUndefinedInObject(input.address);
    input = deleteUndefinedInObject(input);

    // No input, we have nothing to update.
    if (Object.keys(input).length === 0) return undefined;
    return input;
  }

  protected formatToApi({ row, metafields = [] }: FromRow<LocationRow>) {
    let apiData: Partial<typeof this.apiData> = {
      id: row.id ? idToGraphQlGid(GraphQlResourceName.Location, row.id) : undefined,
      name: row.name,
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
    };

    if (metafields.length) {
      apiData.restMetafieldInstances = metafields.map((m) => {
        m.apiData.owner_id = row.id;
        m.apiData.owner_resource = Location.metafieldRestOwnerType;
        return m;
      });
    }

    return apiData;
  }

  public formatToRow(): LocationRow {
    const { apiData: data } = this;

    let obj: LocationRow = {
      id: this.restId,
      graphql_gid: this.graphQlGid,
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
