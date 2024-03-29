import * as coda from '@codahq/packs-sdk';

import { NOT_FOUND } from '../../constants';
import { Identity } from '../../constants';

export const ShopSyncTableSchema = coda.makeObjectSchema({
  properties: {
    id: {
      type: coda.ValueType.Number,
      fixedId: 'id',
      fromKey: 'id',
      required: true,
      useThousandsSeparator: false,
      description: 'The ID for the shop.',
    },
    name: {
      type: coda.ValueType.String,
      fixedId: 'name',
      fromKey: 'name',
      required: true,
      description: 'The name of the shop.',
    },
    address1: {
      type: coda.ValueType.String,
      fixedId: 'address1',
      fromKey: 'address1',
      description: "The shop's street address.",
    },
    address2: {
      type: coda.ValueType.String,
      fixedId: 'address2',
      fromKey: 'address2',
      description: "The optional second line of the shop's street address.",
    },
    checkout_api_supported: {
      type: coda.ValueType.Boolean,
      fixedId: 'checkout_api_supported',
      fromKey: 'checkout_api_supported',
      description: 'Whether the shop is capable of accepting payments directly through the Checkout API.',
    },
    city: {
      type: coda.ValueType.String,
      fixedId: 'city',
      fromKey: 'city',
      description: 'The shop city.',
    },
    country_code: {
      type: coda.ValueType.String,
      fixedId: 'country_code',
      fromKey: 'country_code',
      description: "The two-letter country code corresponding to the shop's country.",
    },
    country_name: {
      type: coda.ValueType.String,
      fixedId: 'country_name',
      fromKey: 'country_name',
      description: "The shop's normalized country name.",
    },
    county_taxes: {
      type: coda.ValueType.Boolean,
      fixedId: 'county_taxes',
      fromKey: 'county_taxes',
      description:
        'Whether the shop is applying taxes on a per-county basis. Only applicable to shops based in the US.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the shop was created.',
    },
    customer_email: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Email,
      fixedId: 'customer_email',
      fromKey: 'customer_email',
      description: 'The contact email used for communication between the shop owner and the customer.',
    },
    currency: {
      type: coda.ValueType.String,
      fixedId: 'currency',
      fromKey: 'currency',
      description: "The three-letter code (ISO 4217 format) for the shop's default currency.",
    },
    domain: {
      type: coda.ValueType.String,
      fixedId: 'domain',
      fromKey: 'domain',
      description: "The shop's domain.",
    },
    enabled_presentment_currencies: {
      type: coda.ValueType.Array,
      items: { type: coda.ValueType.String },
      fixedId: 'enabled_presentment_currencies',
      fromKey: 'enabled_presentment_currencies',
      description:
        'A list of enabled currencies (ISO 4217 format) that the shop accepts. Merchants can enable currencies from their Shopify Payments settings in the Shopify Admin.',
    },
    eligible_for_payments: {
      type: coda.ValueType.Boolean,
      fixedId: 'eligible_for_payments',
      fromKey: 'eligible_for_payments',
      description: 'Whether the shop is eligible to use Shopify Payments.',
    },
    email: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Email,
      fixedId: 'email',
      fromKey: 'email',
      description: 'The contact email used for communication between Shopify and the shop owner.',
    },
    google_apps_domain: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'google_apps_domain',
      fromKey: 'google_apps_domain',
      description: 'The GSuite URL for the store, if applicable.',
    },
    has_discounts: {
      type: coda.ValueType.Boolean,
      fixedId: 'has_discounts',
      fromKey: 'has_discounts',
      description: 'Whether any active discounts exist for the shop.',
    },
    has_gift_cards: {
      type: coda.ValueType.Boolean,
      fixedId: 'has_gift_cards',
      fromKey: 'has_gift_cards',
      description: 'Whether any active gift cards exist for the shop.',
    },
    has_storefront: {
      type: coda.ValueType.Boolean,
      fixedId: 'has_storefront',
      fromKey: 'has_storefront',
      description: 'Whether the shop has an online store.',
    },
    iana_timezone: {
      type: coda.ValueType.String,
      fixedId: 'iana_timezone',
      fromKey: 'iana_timezone',
      description: 'The name of the timezone assigned by the IANA.',
    },
    latitude: {
      type: coda.ValueType.Number,
      fixedId: 'latitude',
      fromKey: 'latitude',
      description: "The latitude of the shop's location.",
    },
    longitude: {
      type: coda.ValueType.Number,
      fixedId: 'longitude',
      fromKey: 'longitude',
      description: "The longitude of the shop's location.",
    },
    money_format: {
      type: coda.ValueType.String,
      fixedId: 'money_format',
      fromKey: 'money_format',
      description: "A string representing the way currency is formatted when the currency isn't specified.",
    },
    money_in_emails_format: {
      type: coda.ValueType.String,
      fixedId: 'money_in_emails_format',
      fromKey: 'money_in_emails_format',
      description:
        "A string representing the way currency is formatted in email notifications when the currency isn't specified.",
    },
    money_with_currency_format: {
      type: coda.ValueType.String,
      fixedId: 'money_with_currency_format',
      fromKey: 'money_with_currency_format',
      description: 'A string representing the way currency is formatted when the currency is specified.',
    },
    money_with_currency_in_emails_format: {
      type: coda.ValueType.String,
      fixedId: 'money_with_currency_in_emails_format',
      fromKey: 'money_with_currency_in_emails_format',
      description:
        'A string representing the way currency is formatted in email notifications when the currency is specified.',
    },
    myshopify_domain: {
      type: coda.ValueType.String,
      fixedId: 'myshopify_domain',
      fromKey: 'myshopify_domain',
      description: "The shop's .myshopify.com domain.",
    },
    password_enabled: {
      type: coda.ValueType.Boolean,
      fixedId: 'password_enabled',
      fromKey: 'password_enabled',
      description: "Whether the password protection page is enabled on the shop's online store.",
    },
    phone: {
      type: coda.ValueType.String,
      fixedId: 'phone',
      fromKey: 'phone',
      description: 'The contact phone number for the shop.',
    },
    plan_display_name: {
      type: coda.ValueType.String,
      fixedId: 'plan_display_name',
      fromKey: 'plan_display_name',
      description: 'The display name of the Shopify plan the shop is on.',
    },
    pre_launch_enabled: {
      type: coda.ValueType.Boolean,
      fixedId: 'pre_launch_enabled',
      fromKey: 'pre_launch_enabled',
      description: "Whether the pre-launch page is enabled on the shop's online store.",
    },
    plan_name: {
      type: coda.ValueType.String,
      fixedId: 'plan_name',
      fromKey: 'plan_name',
      description: 'The name of the Shopify plan the shop is on.',
    },
    primary_locale: {
      type: coda.ValueType.String,
      fixedId: 'primary_locale',
      fromKey: 'primary_locale',
      description: "The shop's primary locale, as configured in the language settings of the shop's theme.",
    },
    province: {
      type: coda.ValueType.String,
      fixedId: 'province',
      fromKey: 'province',
      description: "The shop's normalized province or state name.",
    },
    province_code: {
      type: coda.ValueType.String,
      fixedId: 'province_code',
      fromKey: 'province_code',
      description: "The two- or three-letter code for the shop's province or state.",
    },
    requires_extra_payments_agreement: {
      type: coda.ValueType.Boolean,
      fixedId: 'requires_extra_payments_agreement',
      fromKey: 'requires_extra_payments_agreement',
      description: 'Whether the shop requires an extra Shopify Payments agreement.',
    },
    setup_required: {
      type: coda.ValueType.Boolean,
      fixedId: 'setup_required',
      fromKey: 'setup_required',
      description: 'Whether the shop has any outstanding setup steps.',
    },
    shop_owner: {
      type: coda.ValueType.String,
      fixedId: 'shop_owner',
      fromKey: 'shop_owner',
      description: 'The username of the shop owner.',
    },
    source: {
      type: coda.ValueType.String,
      fixedId: 'source',
      fromKey: 'source',
      description: 'The handle of the partner account that referred the merchant to Shopify, if applicable.',
    },
    taxes_included: {
      type: coda.ValueType.Boolean,
      fixedId: 'taxes_included',
      fromKey: 'taxes_included',
      description: 'Whether taxes are charged for shipping.',
    },
    timezone: {
      type: coda.ValueType.String,
      fixedId: 'timezone',
      fromKey: 'timezone',
      description: 'The name of the timezone the shop is in.',
    },
    transactional_sms_disabled: {
      type: coda.ValueType.Boolean,
      fixedId: 'transactional_sms_disabled',
      fromKey: 'transactional_sms_disabled',
      description: "Whether transactional SMS sent by Shopify are disabled on the shop's online store.",
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description: 'The date and time when the shop was last updated.',
    },
    weight_unit: {
      type: coda.ValueType.String,
      fixedId: 'weight_unit',
      fromKey: 'weight_unit',
      description: 'The default unit of weight measurement for the shop.',
    },
    zip: {
      type: coda.ValueType.String,
      fixedId: 'zip',
      fromKey: 'zip',
      description: "The shop's zip or postal code.",
    },
    marketing_sms_consent_enabled_at_checkout: {
      type: coda.ValueType.Boolean,
      fixedId: 'marketing_sms_consent_enabled_at_checkout',
      fromKey: 'marketing_sms_consent_enabled_at_checkout',
      description: "Whether SMS marketing has been enabled on the shop's checkout configuration settings.",
    },

    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the product in the online shop.',
      fixedId: 'admin_url',
    },
  },
  displayProperty: 'name',
  idProperty: 'id',
  featuredProperties: [
    'id',
    'name',
    'shop_owner',
    'address1',
    'address2',
    'zip',
    'city',
    'country_name',
    'phone',
    'currency',
    'iana_timezone',
    'primary_locale',
    'myshopify_domain',
    'plan_display_name',
    'plan_name',
    'updated_at',
    'admin_url',
  ],

  // Card fields.
  subtitleProperties: ['shop_owner', 'plan_display_name', 'plan_name'],
  // snippetProperty: 'body',
  // imageProperty: 'featuredImage',
  linkProperty: 'admin_url',
});

export const ShopReference = coda.makeReferenceSchemaFromObjectSchema(ShopSyncTableSchema, Identity.Shop);
export const formatShopReference = (id: number, name = NOT_FOUND) => ({ id, name });

export const validShopFields = Object.keys(ShopSyncTableSchema.properties)
  .map((key) => ShopSyncTableSchema.properties[key].fromKey)
  .filter(Boolean);
