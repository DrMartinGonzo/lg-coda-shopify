import * as coda from '@codahq/packs-sdk';

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
    /**
     * ! Deprecated
     */
    /*
    // As of API version 2022-04, this property is deprecated. Use email_marketing_consent instead. Whether the customer has consented to receive marketing material by email.
    accepts_marketing: { type: coda.ValueType.Boolean },
    // As of API version 2022-04, this property is deprecated. Use email_marketing_consent instead. The date and time (ISO 8601 format) when the customer consented or objected to receiving marketing material by email. Set this value whenever the customer consents or objects to marketing materials.
    accepts_marketing_updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // As of API version 2022-04, this property is deprecated. Use email_marketing_consent instead. The marketing subscription opt-in level, as described in the M3AAWG Sender Best Common Practices, that the customer gave when they consented to receive marketing material by email. If the customer does not accept email marketing, then this property will be set to null. Valid values:
    marketing_opt_in_level: { type: coda.ValueType.String },
    */

    /**
     * Disabled
     */
    /*
    admin_graphql_api_id: { type: coda.ValueType.String },
    */

    // A unique identifier for the customer.
    customer_id: { type: coda.ValueType.Number, fromKey: 'id', required: true },
    // Formatted display name. @See formatCustomer function
    display: { type: coda.ValueType.String, required: true },
    // A list of the ten most recently updated addresses for the customer.
    addresses: { type: coda.ValueType.Array, items: CustomerAddressSchema },
    // The three-letter code (ISO 4217 format) for the currency that the customer used when they paid for their last order. Defaults to the shop currency. Returns the shop currency for test orders.
    currency: { type: coda.ValueType.String },
    // The date and time (ISO 8601 format) when the customer was created.
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // The default address for the customer.
    default_address: CustomerAddressSchema,
    // The unique email address of the customer. Attempting to assign the same email address to multiple customers returns an error.
    email: { type: coda.ValueType.String, codaType: coda.ValueHintType.Email },
    // The marketing consent information when the customer consented to receiving marketing material by email. The email property is required to create a customer with email consent information and to update a customer for email consent that doesn't have an email recorded. The customer must have a unique email address associated to the record.
    email_marketing_consent: EmailMarketingConsentSchema,
    // The customer's first name.
    first_name: { type: coda.ValueType.String },
    // The customer's last name.
    last_name: { type: coda.ValueType.String },
    // The ID of the customer's last order.
    last_order_id: { type: coda.ValueType.Number },
    // The name of the customer's last order. This is directly related to the name field on the Order resource.
    last_order_name: { type: coda.ValueType.String },
    // A unique identifier for the customer that's used with Multipass login.
    multipass_identifier: { type: coda.ValueType.String },
    // A note about the customer.
    note: { type: coda.ValueType.String },
    // The number of orders associated with this customer. Test and archived orders aren't counted.
    orders_count: { type: coda.ValueType.Number },
    // The customer's password.
    password: { type: coda.ValueType.String },
    // The customer's password that's confirmed.
    password_confirmation: { type: coda.ValueType.String },
    // The unique phone number (E.164 format) for this customer. Attempting to assign the same phone number to multiple customers returns an error. The property can be set using different formats, but each format must represent a number that can be dialed from anywhere in the world.
    phone: { type: coda.ValueType.String },
    // The marketing consent information when the customer consented to receiving marketing material by SMS. The phone property is required to create a customer with SMS consent information and to perform an SMS update on a customer that doesn't have a phone number recorded. The customer must have a unique phone number associated to the record.
    sms_marketing_consent: SmsMarketingConsentSchema,
    // The state of the customer's account with a shop. Default value: disabled. Valid values:
    //  - disabled: The customer doesn't have an active account. Customer accounts can be disabled from the Shopify admin at any time.
    //  - invited: The customer has received an email invite to create an account.
    //  - enabled: The customer has created an account.
    //  - declined: The customer declined the email invite to create an account.
    state: { type: coda.ValueType.String },
    // Tags that the shop owner has attached to the customer, formatted as a string of comma-separated values. A customer can have up to 250 tags. Each tag can have up to 255 characters.
    tags: { type: coda.ValueType.String },
    // Whether the customer is exempt from paying taxes on their order. If true, then taxes won't be applied to an order at checkout. If false, then taxes will be applied at checkout.
    tax_exempt: { type: coda.ValueType.Boolean },
    // Whether the customer is exempt from paying specific taxes on their order. Canadian taxes only.
    tax_exemptions: { type: coda.ValueType.Array, items: { type: coda.ValueType.String } },
    // The total amount of money that the customer has spent across their order history.
    total_spent: { type: coda.ValueType.Number, codaType: coda.ValueHintType.Currency },
    // The date and time (ISO 8601 format) when the customer information was last updated.
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    // Whether the customer has verified their email address.
    verified_email: { type: coda.ValueType.Boolean },
  },
  displayProperty: 'display',
  idProperty: 'customer_id',
  featuredProperties: ['email', 'first_name', 'last_name', 'phone', 'total_spent'],
});

export const CustomerReference = coda.makeReferenceSchemaFromObjectSchema(CustomerSchema, 'Customer');
