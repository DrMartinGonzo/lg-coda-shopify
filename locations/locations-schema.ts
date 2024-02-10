import * as coda from '@codahq/packs-sdk';
import { IDENTITY_LOCATION } from '../constants';

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
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
      fromKey: 'active',
      description:
        "Whether the location is active. If true, then the location can be used to sell products, stock inventory, and fulfill orders. Merchants can deactivate locations from the Shopify admin. Deactivated locations don't contribute to the shop's location limit.",
    },
    address1: {
      type: coda.ValueType.String,
      fixedId: 'address1',
      fromKey: 'address1',
      description: "The location's street address.",
    },
    address2: {
      type: coda.ValueType.String,
      fixedId: 'address2',
      fromKey: 'address2',
      description: "The optional second line of the location's street address.",
    },
    city: {
      type: coda.ValueType.String,
      fixedId: 'city',
      fromKey: 'city',
      description: 'The city the location is in.',
    },
    country: {
      type: coda.ValueType.String,
      fixedId: 'country',
      fromKey: 'country',
      description: 'The country the location is in.',
    },
    country_code: {
      type: coda.ValueType.String,
      fixedId: 'country_code',
      fromKey: 'country_code',
      description: 'The two-letter code (ISO 3166-1 alpha-2 format) corresponding to country the location is in.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the location was created.',
    },
    legacy: {
      type: coda.ValueType.Boolean,
      fixedId: 'legacy',
      fromKey: 'legacy',
      description:
        "Whether this is a fulfillment service location. If true, then the location is a fulfillment service location. If false, then the location was created by the merchant and isn't tied to a fulfillment service.",
    },
    name: {
      type: coda.ValueType.String,
      fixedId: 'name',
      fromKey: 'name',
      required: true,
      description: 'The name of the location.',
    },
    phone: {
      type: coda.ValueType.String,
      fixedId: 'phone',
      fromKey: 'phone',
      description: 'The phone number of the location.',
    },
    province: {
      type: coda.ValueType.String,
      fixedId: 'province',
      fromKey: 'province',
      description: 'The province, state, or district of the location.',
    },
    province_code: {
      type: coda.ValueType.String,
      fixedId: 'province_code',
      fromKey: 'province_code',
      description: 'The province, state, or district code (ISO 3166-2 alpha-2 format) of the location.',
    },
    zip: {
      type: coda.ValueType.String,
      fixedId: 'zip',
      fromKey: 'zip',
      description: 'The zip or postal code.',
    },

    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'admin_url',
      description: 'A link to the location in the Shopify admin.',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      fixedId: 'graphql_gid',
      description: 'The GraphQL GID of the location.',
    },
  },
  displayProperty: 'name',
  idProperty: 'location_id',
  // admin_url will be the last featured property, added in Customers dynamicOptions after the eventual metafields
  featuredProperties: ['address1', 'address2', 'name', 'phone', 'city'],

  // Card fields.
  subtitleProperties: ['address1', 'address2', 'city', 'country'],
  // snippetProperty: '',
  linkProperty: 'admin_url',
});

export const LocationReference = coda.makeReferenceSchemaFromObjectSchema(LocationSchema, IDENTITY_LOCATION);

export const locationFieldDependencies = [
  {
    field: 'id',
    dependencies: ['admin_url'],
  },
];
