import * as coda from '@codahq/packs-sdk';
import { IDENTITY_CUSTOMER } from '../constants';

const CustomerAddressSchema = coda.makeObjectSchema({
  properties: {
    // A unique identifier for the address.
    address_id: { type: coda.ValueType.Number, fromKey: 'id', required: true },
    // The street address of the address.
    address1: { type: coda.ValueType.String },
    // An optional additional field for the street address of the address.
    address2: { type: coda.ValueType.String },
    // The city, town, or village of the address.
    city: { type: coda.ValueType.String },
    // The company of the person associated with the address.
    company: { type: coda.ValueType.String },
    // The name of the country of the address.
    country: { type: coda.ValueType.String },
    // The two-letter code (ISO 3166-1 format) for the country of the address.
    country_code: { type: coda.ValueType.String },
    // The customer's normalized country name
    country_name: { type: coda.ValueType.String },
    // A unique identifier for the customer.
    customer_id: { type: coda.ValueType.Number },
    // Returns true for each default address.
    default: { type: coda.ValueType.Boolean },
    // The first name of the person.
    first_name: { type: coda.ValueType.String },
    // The last name of the person.
    last_name: { type: coda.ValueType.String },
    // The full name of the person.
    name: { type: coda.ValueType.String },
    // The latitude of the address.
    latitude: { type: coda.ValueType.String },
    // The longitude of the address.
    longitude: { type: coda.ValueType.String },
    // The phone number at the address.
    phone: { type: coda.ValueType.String },
    // province: The name of the region (for example, province, state, or prefecture) of the address.
    province: { type: coda.ValueType.String },
    // province_code: The two-letter abbreviation of the region of the address.
    province_code: { type: coda.ValueType.String },
    // The postal code (for example, zip, postcode, or Eircode) of the address.
    zip: { type: coda.ValueType.String },
  },
  displayProperty: 'address1',
});

// The marketing consent information when the customer consented to receiving marketing material by email. The email property is required to create a customer with email consent information and to update a customer for email consent that doesn't have an email recorded. The customer must have a unique email address associated to the record.
const EmailMarketingConsentSchema = coda.makeObjectSchema({
  properties: {
    // The current email marketing state for the customer.
    state: { type: coda.ValueType.String },
    // The marketing subscription opt-in level, as described in the M3AAWG Sender Best Common Practices, that the customer gave when they consented to receive marketing material by email.
    opt_in_level: { type: coda.ValueType.String },
    // The date and time when the customer consented to receive marketing material by email. If no date is provided, then the date and time when the consent information was sent is used.
    consent_updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
  },
  displayProperty: 'state',
});

// The marketing consent information when the customer consented to receiving marketing material by SMS. The phone property is required to create a customer with SMS consent information and to perform an SMS update on a customer that doesn't have a phone number recorded. The customer must have a unique phone number associated to the record.
const SmsMarketingConsentSchema = coda.makeObjectSchema({
  properties: {
    // The current SMS marketing state for the customer.
    state: { type: coda.ValueType.String },
    // The marketing subscription opt-in level, as described in the M3AAWG Sender Best Common Practices, that the customer gave when they consented to receive marketing material by SMS.
    opt_in_level: { type: coda.ValueType.String },
    // The date and time when the customer consented to receive marketing material by SMS. If no date is provided, then the date and time when the consent information was sent is used.
    consent_updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // The source for whether the customer has consented to receive marketing material by SMS.
    consent_collected_from: { type: coda.ValueType.String },
  },
  displayProperty: 'state',
});

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const CustomerSchema = coda.makeObjectSchema({
  properties: {
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the customer in the Shopify admin.',
      fixedId: 'admin_url',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the customer.',
      required: true,
      fixedId: 'graphql_gid',
    },
    // A unique identifier for the customer.
    customer_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
      fixedId: 'customer_id',
    },
    // @See formatCustomer function
    display: {
      type: coda.ValueType.String,
      description: 'Formatted display name.',
      required: true,
      fixedId: 'display',
    },
    addresses: {
      type: coda.ValueType.Array,
      items: CustomerAddressSchema,
      description: 'A list of the ten most recently updated addresses for the customer.',
      fixedId: 'addresses',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the customer was created.',
      fixedId: 'created_at',
    },
    default_address: {
      ...CustomerAddressSchema,
      description: 'The default address for the customer.',
      fixedId: 'default_address',
    },
    email: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Email,
      description:
        'The unique email address of the customer. Attempting to assign the same email address to multiple customers returns an error.',
      mutable: true,
      fixedId: 'email',
    },
    // The email property is required to create a customer with email consent information and to update a customer for email consent that doesn't have an email recorded. The customer must have a unique email address associated to the record.
    email_marketing_consent: {
      ...EmailMarketingConsentSchema,
      description:
        'The marketing consent information when the customer consented to receiving marketing material by email.',
      fixedId: 'email_marketing_consent',
    },
    first_name: {
      type: coda.ValueType.String,
      description: "The customer's first name.",
      mutable: true,
      fixedId: 'first_name',
    },
    last_name: {
      type: coda.ValueType.String,
      description: "The customer's first last.",
      mutable: true,
      fixedId: 'last_name',
    },
    last_order_id: {
      type: coda.ValueType.Number,
      description: 'The ID of the customer’s last order.',
      fixedId: 'last_order_id',
    },
    last_order_name: {
      type: coda.ValueType.String,
      description: 'The name of the customer’s last order.',
      fixedId: 'last_order_name',
    },
    multipass_identifier: {
      type: coda.ValueType.String,
      description: "A unique identifier for the customer that's used with Multipass login.",
      fixedId: 'multipass_identifier',
    },
    note: {
      type: coda.ValueType.String,
      description: 'A note about the customer.',
      mutable: true,
      fixedId: 'note',
    },
    orders_count: {
      type: coda.ValueType.Number,
      description: 'The number of orders associated with the customer.',
      fixedId: 'orders_count',
    },
    phone: {
      type: coda.ValueType.String,
      description:
        'The unique phone number (E.164 format) for this customer.\nAttempting to assign the same phone number to multiple customers returns an error. The property can be set using different formats, but each format must represent a number that can be dialed from anywhere in the world.',
      mutable: true,
      fixedId: 'phone',
    },
    // The phone property is required to create a customer with SMS consent information and to perform an SMS update on a customer that doesn't have a phone number recorded. The customer must have a unique phone number associated to the record.
    sms_marketing_consent: {
      ...SmsMarketingConsentSchema,
      description:
        'The marketing consent information when the customer consented to receiving marketing material by SMS.',
      fixedId: 'sms_marketing_consent',
    },
    state: {
      type: coda.ValueType.String,
      description:
        "The state of the customer's account with a shop. Default value: disabled. Valid values:\n- disabled: The customer doesn't have an active account. Customer accounts can be disabled from the Shopify admin at any time.\n- invited: The customer has received an email invite to create an account.\n- enabled: The customer has created an account.\n- declined: The customer declined the email invite to create an account.",
      fixedId: 'state',
    },
    tags: {
      type: coda.ValueType.String,
      description:
        'Tags that the shop owner has attached to the customer, formatted as a string of comma-separated values.\nA customer can have up to 250 tags. Each tag can have up to 255 characters.',
      mutable: true,
      fixedId: 'tags',
    },
    tax_exempt: {
      type: coda.ValueType.Boolean,
      description: 'Whether the customer is exempt from paying taxes on their order.',
      fixedId: 'tax_exempt',
    },
    tax_exemptions: {
      type: coda.ValueType.Array,
      items: { type: coda.ValueType.String },
      description: 'Whether the customer is exempt from paying specific taxes on their order. Canadian taxes only.',
      fixedId: 'tax_exemptions',
    },
    total_spent: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      description: 'The total amount of money that the customer has spent across their order history.',
      fixedId: 'total_spent',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the customer information was last updated.',
      fixedId: 'updated_at',
    },
    verified_email: {
      type: coda.ValueType.Boolean,
      description: 'Whether the customer has verified their email address.',
      fixedId: 'verified_email',
    },
  },
  displayProperty: 'display',
  idProperty: 'customer_id',
  featuredProperties: ['email', 'first_name', 'last_name', 'phone', 'total_spent', 'admin_url'],

  // Card fields.
  subtitleProperties: ['email', 'total_spent', 'tags', 'created_at'],
  snippetProperty: 'note',
  linkProperty: 'admin_url',
});

export const CustomerReference = coda.makeReferenceSchemaFromObjectSchema(CustomerSchema, IDENTITY_CUSTOMER);

export const customerFieldDependencies = [
  {
    field: 'id',
    dependencies: ['admin_url'],
  },
];
