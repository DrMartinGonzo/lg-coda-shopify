import * as coda from '@codahq/packs-sdk';

export const BaseAddressSchema = coda.makeObjectSchema({
  properties: {
    display: { type: coda.ValueType.String, description: 'Formatted display name of the address.' },
    address1: { type: coda.ValueType.String, description: 'The street address of the address.' },
    address2: {
      type: coda.ValueType.String,
      description: 'An optional additional field for the street address of the address.',
    },
    city: { type: coda.ValueType.String, description: 'The city, town, or village of the address.' },
    company: { type: coda.ValueType.String, description: 'The company of the person associated with the address.' },
    country: { type: coda.ValueType.String, description: 'The name of the country of the address.' },
    country_code: {
      type: coda.ValueType.String,
      description: 'The two-letter code (ISO 3166-1 format) for the country of the address.',
    },
    country_name: { type: coda.ValueType.String, description: 'Normalized country name of the address.' },
    first_name: { type: coda.ValueType.String, description: 'The first name of the person.' },
    last_name: { type: coda.ValueType.String, description: 'The last name of the person.' },
    name: { type: coda.ValueType.String, description: 'The full name of the person.' },
    latitude: { type: coda.ValueType.String, description: 'The latitude of the address.' },
    longitude: { type: coda.ValueType.String, description: 'The longitude of the address.' },
    phone: { type: coda.ValueType.String, description: 'The phone number at the address.' },
    province: {
      type: coda.ValueType.String,
      description: 'The name of the region (for example, province, state, or prefecture) of the address.',
    },
    province_code: {
      type: coda.ValueType.String,
      description: 'The two-letter abbreviation of the region of the address.',
    },
    zip: {
      type: coda.ValueType.String,
      description: 'The postal code (for example, zip, postcode, or Eircode) of the address.',
    },
  },
  displayProperty: 'display',
});

export const CustomerAddressSchema = coda.makeObjectSchema({
  properties: {
    ...BaseAddressSchema.properties,
    address_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
      useThousandsSeparator: false,
      description: 'A unique identifier for the address.',
    },
    default: { type: coda.ValueType.Boolean, description: 'Returns true for each default address.' },
  },
  displayProperty: 'display',
});
