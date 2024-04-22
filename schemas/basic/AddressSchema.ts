import * as PROPS from '../../coda/coda-properties';
import * as coda from '@codahq/packs-sdk';

export const addressAddress1 = {
  ...PROPS.STRING,
  fromKey: 'address1',
  fixedId: 'address1',
  description: 'The street address of the address.',
};
export const addressAddress2 = {
  ...PROPS.STRING,
  fromKey: 'address2',
  fixedId: 'address2',
  description: 'An optional second line for the address. Typically the number of the apartment, suite, or unit.',
};
export const addressCityProp = {
  ...PROPS.STRING,
  fromKey: 'city',
  fixedId: 'city',
  description: 'The city, town, or village of the address.',
};
export const addressCountryProp = {
  ...PROPS.STRING,
  fromKey: 'country',
  fixedId: 'country',
  description: 'The name of the country of the address.',
};
export const addressCountryCodeProp = {
  ...PROPS.STRING,
  fromKey: 'country_code',
  fixedId: 'country_code',
  description: 'The two-letter code (ISO 3166-1 alpha-2 format) for the country of the address.',
};
export const addressCountryNameProp = {
  ...PROPS.STRING,
  fromKey: 'country_name',
  fixedId: 'country_name',
  description: 'Normalized country name of the address.',
};
export const addressLongitudeProp = {
  ...PROPS.STRING,
  fromKey: 'longitude',
  fixedId: 'longitude',
  description: 'The longitude of the address',
};
export const addressLatitudeProp = {
  ...PROPS.STRING,
  fromKey: 'latitude',
  fixedId: 'latitude',
  description: 'The latitude of the address',
};
export const addressPhoneProp = {
  ...PROPS.STRING,
  fromKey: 'phone',
  fixedId: 'phone',
  description: 'The phone number at the address.',
};
export const addressProvinceProp = {
  ...PROPS.STRING,
  fromKey: 'province',
  fixedId: 'province',
  description: 'The province, state, or district of the address.',
};
export const addressProvinceCodeProp = {
  ...PROPS.STRING,
  fromKey: 'province_code',
  fixedId: 'province_code',
  description: 'The province, state, or district code (ISO 3166-2 alpha-2 format) of the address.',
};
export const addressZipProp = {
  ...PROPS.STRING,
  fromKey: 'zip',
  fixedId: 'zip',
  description: 'The postal code (for example, zip, postcode, or Eircode) of the address.',
};

const addressPersonCompanyProp = {
  ...PROPS.STRING,
  fromKey: 'company',
  fixedId: 'company',
  description: 'The company of the person associated with the address.',
};
export const addressPersonFirstNameProp = {
  ...PROPS.STRING,
  fromKey: 'first_name',
  fixedId: 'first_name',
  description: 'The first name of the person.',
};
export const addressPersonLastNameProp = {
  ...PROPS.STRING,
  fromKey: 'last_name',
  fixedId: 'last_name',
  description: 'The last name of the person.',
};
const addressPersonFullNameProp = {
  ...PROPS.STRING,
  fromKey: 'name',
  fixedId: 'name',
  description: 'The full name of the person.',
};

export const AddressSchema = coda.makeObjectSchema({
  properties: {
    display: { type: coda.ValueType.String, description: 'Formatted display name of the address.' },
    address1: addressAddress1,
    address2: addressAddress2,
    city: addressCityProp,
    company: addressPersonCompanyProp,
    country: addressCountryProp,
    country_code: addressCountryCodeProp,
    country_name: addressCountryNameProp,
    first_name: addressPersonFirstNameProp,
    last_name: addressPersonLastNameProp,
    name: addressPersonFullNameProp,
    latitude: addressLongitudeProp,
    longitude: addressLatitudeProp,
    phone: addressPhoneProp,
    province: addressProvinceProp,
    province_code: addressProvinceCodeProp,
    zip: addressZipProp,
  },
  displayProperty: 'display',
});
