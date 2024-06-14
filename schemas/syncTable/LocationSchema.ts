import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { NOT_FOUND, OPTIONS_COUNTRY_NAMES, PACK_IDENTITIES } from '../../constants';
import { FormatRowReferenceFn } from '../CodaRows.types';
import {
  addressAddress1,
  addressAddress2,
  addressCityProp,
  addressCountryCodeProp,
  addressCountryProp,
  addressPhoneProp,
  addressProvinceCodeProp,
  addressProvinceProp,
  addressZipProp,
} from '../basic/AddressSchema';
import { LocalPickupSettingsSchema } from '../basic/LocalPickupSettingsSchema';

export const LocationSyncTableSchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('location'),
    active: {
      type: coda.ValueType.Boolean,
      fixedId: 'active',
      description:
        "Whether the location is active. If true, then the location can be used to sell products, stock inventory, and fulfill orders. Merchants can deactivate locations from the Shopify admin. Deactivated locations don't contribute to the shop's location limit.",
    },
    address1: { ...addressAddress1, mutable: true },
    address2: { ...addressAddress2, mutable: true },
    city: { ...addressCityProp, mutable: true },
    country: addressCountryProp,
    country_code: {
      ...addressCountryCodeProp,
      ...PROPS.SELECT_LIST,
      options: OPTIONS_COUNTRY_NAMES,
      mutable: true,
      requireForUpdates: false,
    },
    // created_at: {
    //   ...PROPS.DATETIME_STRING,
    //   fixedId: 'created_at',
    //   description: 'The date and time when the location was created.',
    // },
    name: {
      type: coda.ValueType.String,
      fixedId: 'name',
      required: true,
      mutable: true,
      description: 'The name of the location.',
    },
    phone: { ...addressPhoneProp, mutable: true },
    province: addressProvinceProp,
    province_code: { ...addressProvinceCodeProp, mutable: true },
    zip: { ...addressZipProp, mutable: true },
    admin_url: PROPS.makeAdminUrlProp('location'),
    stock_url: {
      ...PROPS.LINK,
      fixedId: 'stock_url',
      description: 'A link to the stock at the location in the Shopify admin.',
    },
    graphql_gid: PROPS.makeGraphQlGidProp('location'),
    // Requires any of shipping access scopes or preferences user permission
    local_pickup_settings: {
      ...LocalPickupSettingsSchema,
      fixedId: 'local_pickup_settings',
      description: 'Local pickup settings for the location.',
    },
    ships_inventory: {
      type: coda.ValueType.Boolean,
      fixedId: 'ships_inventory',
      description:
        'Whether this location is used for calculating shipping rates. In multi-origin shipping mode, this flag is ignored.',
    },
    fulfills_online_orders: {
      type: coda.ValueType.Boolean,
      fixedId: 'fulfills_online_orders',
      description: 'Whether this location can fulfill online orders.',
    },
    fulfillment_service: {
      type: coda.ValueType.String,
      fixedId: 'fulfillment_service',
      description: 'Name of the service provider that fulfills from this location..',
    },
    has_active_inventory: {
      type: coda.ValueType.Boolean,
      fixedId: 'has_active_inventory',
      description: 'Whether this location has active inventory.',
    },
  },
  displayProperty: 'name',
  idProperty: 'id',
  // admin_url and stock_url will be the last featured properties, added in Locations dynamicOptions after the eventual metafields
  featuredProperties: ['address1', 'address2', 'name', 'phone', 'city'],

  // Card fields.
  subtitleProperties: ['active', 'address1', 'address2', 'city', 'country'],
  linkProperty: 'admin_url',
});

export const LocationReference = coda.makeReferenceSchemaFromObjectSchema(
  LocationSyncTableSchema,
  PACK_IDENTITIES.Location
);
export const formatLocationReference: FormatRowReferenceFn<number, 'name'> = (id: number, name = NOT_FOUND) => ({
  id,
  name,
});
