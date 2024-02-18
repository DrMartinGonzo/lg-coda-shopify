// #region Imports
import * as coda from '@codahq/packs-sdk';

import { fetchShopDetails } from './shop-functions';

// #endregion

// TODO: url for shop metafields is:
// `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/metafields.json`;

const validShopFields = [
  'address1',
  'address2',
  'checkout_api_supported',
  'city',
  'country',
  'country_code',
  'country_name',
  'county_taxes',
  'created_at',
  'customer_email',
  'currency',
  'domain',
  'enabled_presentment_currencies',
  'eligible_for_card_reader_giveaway',
  'eligible_for_payments',
  'email',
  'finances',
  'force_ssl',
  'google_apps_domain',
  'google_apps_login_enabled',
  'has_discounts',
  'has_gift_cards',
  'has_storefront',
  'iana_timezone',
  'id',
  'latitude',
  'longitude',
  'money_format',
  'money_in_emails_format',
  'money_with_currency_format',
  'money_with_currency_in_emails_format',
  'multi_location_enabled',
  'myshopify_domain',
  'name',
  'password_enabled',
  'phone',
  'plan_display_name',
  'pre_launch_enabled',
  'cookie_consent_level',
  'plan_name',
  'primary_locale',
  'primary_location_id',
  'province',
  'province_code',
  'requires_extra_payments_agreement',
  'setup_required',
  'shop_owner',
  'source',
  'taxes_included',
  'tax_shipping',
  'timezone',
  'transactional_sms_disabled',
  'updated_at',
  'weight_unit',
  'zip',
  'marketing_sms_consent_enabled_at_checkout',
];

// #region Formulas
export const Formula_ShopField = coda.makeFormula({
  name: 'ShopField',
  description: 'Get a single shop field.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'field',
      description: 'shop field to return',
      autocomplete: validShopFields,
    }),
  ],
  resultType: coda.ValueType.String,
  execute: async function ([field], context: coda.SyncExecutionContext) {
    if (validShopFields.indexOf(field) === -1) {
      throw new coda.UserVisibleError(`Unknown field '${field}' provided`);
    }
    const shop = await fetchShopDetails([field], context);
    if (shop && shop[field]) return shop[field];
  },
});
// #endregion
