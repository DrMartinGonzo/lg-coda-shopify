import * as coda from '@codahq/packs-sdk';
import { IDENTITY_LOCATION } from '../../constants';
import { countryCodes } from '../../types/misc';
import { LocalPickupSettingsSchema } from '../basic/LocalPickupSettingsSchema';

export const LocationSchema = coda.makeObjectSchema({
  properties: {
    location_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
      fixedId: 'location_id',
      useThousandsSeparator: false,
      description: 'The ID of the location.',
    },
    active: {
      type: coda.ValueType.Boolean,
      fixedId: 'active',
      description:
        "Whether the location is active. If true, then the location can be used to sell products, stock inventory, and fulfill orders. Merchants can deactivate locations from the Shopify admin. Deactivated locations don't contribute to the shop's location limit.",
    },
    address1: {
      type: coda.ValueType.String,
      fixedId: 'address1',
      mutable: true,
      description: "The location's street address.",
    },
    address2: {
      type: coda.ValueType.String,
      fixedId: 'address2',
      mutable: true,
      description: "The optional second line of the location's street address.",
    },
    city: {
      type: coda.ValueType.String,
      fixedId: 'city',
      mutable: true,
      description: 'The city the location is in.',
    },
    country: {
      type: coda.ValueType.String,
      fixedId: 'country',
      description: 'The country the location is in.',
    },
    country_code: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      options: countryCodes,
      fixedId: 'country_code',
      mutable: true,
      requireForUpdates: false,
      description: 'The two-letter code (ISO 3166-1 alpha-2 format) corresponding to country the location is in.',
    },
    // created_at: {
    //   type: coda.ValueType.String,
    //   codaType: coda.ValueHintType.DateTime,
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
    phone: {
      type: coda.ValueType.String,
      fixedId: 'phone',
      mutable: true,
      description: 'The phone number of the location.',
    },
    province: {
      type: coda.ValueType.String,
      fixedId: 'province',
      description: 'The province, state, or district of the location.',
    },
    province_code: {
      type: coda.ValueType.String,
      fixedId: 'province_code',
      mutable: true,
      description: 'The province, state, or district code (ISO 3166-2 alpha-2 format) of the location.',
    },
    zip: {
      type: coda.ValueType.String,
      fixedId: 'zip',
      mutable: true,
      description: 'The zip or postal code.',
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'admin_url',
      description: 'A link to the location in the Shopify admin.',
    },
    stock_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'stock_url',
      description: 'A link to the stock at the location in the Shopify admin.',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fixedId: 'graphql_gid',
      description: 'The GraphQL GID of the location.',
    },
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
  idProperty: 'location_id',
  // admin_url and stock_url will be the last featured properties, added in Locations dynamicOptions after the eventual metafields
  featuredProperties: ['address1', 'address2', 'name', 'phone', 'city'],

  // Card fields.
  subtitleProperties: ['active', 'address1', 'address2', 'city', 'country'],
  linkProperty: 'admin_url',

});

export const LocationReference = coda.makeReferenceSchemaFromObjectSchema(LocationSchema, IDENTITY_LOCATION);