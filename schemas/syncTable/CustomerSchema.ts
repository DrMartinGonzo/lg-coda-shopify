import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';
import { NOT_FOUND, PACK_IDENTITIES } from '../../constants';
import { FormatRowReferenceFn } from '../CodaRows.types';
import { addressPersonFirstNameProp, addressPersonLastNameProp, addressPhoneProp } from '../basic/AddressSchema';
import { CustomerAddressSchema } from '../basic/CustomerAddressSchema';

// #region Constants and Helpers
export const CONSENT_STATE__SUBSCRIBED = { display: 'Subscribed', value: 'subscribed' };
const CONSENT_STATE__NOT_SUBSCRIBED = { display: 'Not subscribed', value: 'not_subscribed' };
export const CONSENT_STATE__UNSUBSCRIBED = { display: 'Unsubscribed', value: 'unsubscribed' };
const CONSENT_STATE__REDACTED = { display: 'Redacted', value: 'redacted' };
const CONSENT_STATE__INVALID = { display: 'Invalid', value: 'invalid' };
const CONSENT_STATE__PENDING = { display: 'Pending', value: 'pending' };

// After providing their information, the customer receives a confirmation and is required to perform a intermediate step before receiving marketing information.
const CONSENT_OPT_IN_LEVEL__CONFIRMED_OPT_IN = { display: 'Confirmed opt-in', value: 'confirmed_opt_in' };
// After providing their information, the customer receives marketing information without any intermediate steps.
export const CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN = { display: 'Single opt-in', value: 'single_opt_in' };
// The customer receives marketing information but how they were opted in is unknown.
const CONSENT_OPT_IN_LEVEL__UNKNOWN = { display: 'Unknown', value: 'unknown' };

const MARKETING_CONSENT_ALL_OPTIONS = [
  CONSENT_STATE__SUBSCRIBED,
  CONSENT_STATE__NOT_SUBSCRIBED,
  CONSENT_STATE__UNSUBSCRIBED,
  CONSENT_STATE__REDACTED,
  CONSENT_STATE__INVALID,
  CONSENT_STATE__PENDING,
]
  .map((state) =>
    [CONSENT_OPT_IN_LEVEL__CONFIRMED_OPT_IN, CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN, CONSENT_OPT_IN_LEVEL__UNKNOWN].map(
      (optInLevel) => {
        return {
          state: state.value,
          opt_in_level: optInLevel.value,
          display: `${state.display}: ${optInLevel.display}`,
        };
      }
    )
  )
  .flat();

const MARKETING_CONSENT_UPDATE_OPTIONS = MARKETING_CONSENT_ALL_OPTIONS.filter(
  (option) =>
    [CONSENT_STATE__SUBSCRIBED, CONSENT_STATE__UNSUBSCRIBED].map((s) => s.value).includes(option.state) &&
    option.opt_in_level === CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value
);

export const customerTaxExemptionsProp = {
  type: coda.ValueType.Array,
  items: PROPS.STRING,
  fixedId: 'tax_exemptions',
  fromKey: 'tax_exemptions',
  description: 'Whether the customer is exempt from paying specific taxes on their order. Canadian taxes only.',
} as coda.ArraySchema<typeof PROPS.STRING> & coda.ObjectSchemaProperty;
export const customerTaxExemptProp = {
  ...PROPS.BOOLEAN,
  fixedId: 'tax_exempt',
  fromKey: 'tax_exempt',
  description: 'Whether the customer is exempt from paying taxes on their order.',
};
// #endregion

export const CustomerSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: PROPS.makeAdminUrlProp('customer'),
    graphql_gid: PROPS.makeGraphQlGidProp('customer'),
    id: PROPS.makeRequiredIdNumberProp('customer'),
    // @See formatCustomer function
    display: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'display',
      description: 'Formatted display name.',
    },
    addresses: {
      type: coda.ValueType.Array,
      items: CustomerAddressSchema,
      fixedId: 'addresses',
      fromKey: 'addresses',
      description: 'A list of the ten most recently updated addresses for the customer.',
    },
    created_at: PROPS.makeCreatedAtProp('customer'),
    default_address: {
      ...CustomerAddressSchema,
      fixedId: 'default_address',
      fromKey: 'default_address',
      description: 'The default address for the customer.',
    },
    email: {
      ...PROPS.EMAIL,
      mutable: true,
      fixedId: 'email',
      fromKey: 'email',
      description:
        'The unique email address of the customer. Attempting to assign the same email address to multiple customers returns an error.',
    },
    accepts_email_marketing: {
      type: coda.ValueType.Boolean,
      fixedId: 'accepts_email_marketing',
      mutable: true,
      description: 'Wether the customer consented to receiving marketing material by email.',
    },
    accepts_sms_marketing: {
      type: coda.ValueType.Boolean,
      fixedId: 'accepts_sms_marketing',
      mutable: true,
      description:
        'Wether the customer consented to receiving marketing material by SMS. The phone property is required to create a customer with SMS consent information and to perform an SMS update on a customer.',
    },
    // Disabled for now, prefer to use simple checkboxes
    /*
    email_marketing_consent: {
      ...PROPS.SELECT_LIST,
      description:
        'The marketing consent information when the customer consented to receiving marketing material by email.',
      fixedId: 'email_marketing_consent',
      mutable: true,
      options: MARKETING_CONSENT_UPDATE_OPTIONS.map((option) => option.display),
    },
    */
    // Disabled for now, prefer to use simple checkboxes
    /*
    sms_marketing_consent: {
      // ...SmsMarketingConsentSchema,
      ...PROPS.SELECT_LIST,
      description:
        'The marketing consent information when the customer consented to receiving marketing material by SMS. The customer must have a unique phone number associated to the record to be able to update.',
      fixedId: 'sms_marketing_consent',
      mutable: true,
      options: MARKETING_CONSENT_UPDATE_OPTIONS.map((option) => option.display),
    },
    */
    first_name: {
      ...addressPersonFirstNameProp,
      mutable: true,
      description: "The customer's first name.",
    },
    last_name: {
      ...addressPersonLastNameProp,
      mutable: true,
      description: "The customer's last name.",
    },
    last_order_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'last_order_id',
      fromKey: 'last_order_id',
      description: 'The ID of the customer’s last order.',
    },
    last_order_name: {
      type: coda.ValueType.String,
      fixedId: 'last_order_name',
      fromKey: 'last_order_name',
      description: 'The name of the customer’s last order.',
    },
    multipass_identifier: {
      type: coda.ValueType.String,
      fixedId: 'multipass_identifier',
      fromKey: 'multipass_identifier',
      description: "A unique identifier for the customer that's used with Multipass login.",
    },
    note: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'note',
      fromKey: 'note',
      description: 'A note about the customer.',
    },
    orders_count: {
      type: coda.ValueType.Number,
      fixedId: 'orders_count',
      fromKey: 'orders_count',
      description: 'The number of orders associated with the customer.',
    },
    phone: {
      ...addressPhoneProp,
      mutable: true,
      description:
        'The unique phone number (E.164 format) for this customer.\nAttempting to assign the same phone number to multiple customers returns an error. The property can be set using different formats, but each format must represent a number that can be dialed from anywhere in the world.',
    },
    state: {
      type: coda.ValueType.String,
      fixedId: 'state',
      fromKey: 'state',
      description: `The state of the customer's account with a shop. Default value: disabled. Valid values:
- disabled: The customer doesn't have an active account. Customer accounts can be disabled from the Shopify admin at any time.
- invited: The customer has received an email invite to create an account.
- enabled: The customer has created an account.
- declined: The customer declined the email invite to create an account.`,
    },
    tags: {
      ...PROPS.makeTagsProp('customer'),
      mutable: true,
    },
    tax_exempt: customerTaxExemptProp,
    tax_exemptions: customerTaxExemptionsProp,
    total_spent: {
      ...PROPS.CURRENCY,
      fixedId: 'total_spent',
      fromKey: 'total_spent',
      description: 'The total amount of money that the customer has spent across their order history.',
    },
    updated_at: PROPS.makeUpdatedAtProp('customer'),
    verified_email: {
      type: coda.ValueType.Boolean,
      fixedId: 'verified_email',
      fromKey: 'verified_email',
      description: 'Whether the customer has verified their email address.',
    },
  },
  displayProperty: 'display',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Customers dynamicOptions after the eventual metafields
  featuredProperties: ['email', 'first_name', 'last_name', 'phone', 'total_spent'],

  // Card fields.
  subtitleProperties: ['email', 'total_spent', 'tags', 'created_at'],
  snippetProperty: 'note',
  linkProperty: 'admin_url',
});

export const CustomerReference = coda.makeReferenceSchemaFromObjectSchema(
  CustomerSyncTableSchema,
  PACK_IDENTITIES.Customer
);
export const formatCustomerReference: FormatRowReferenceFn<number, 'display'> = (id: number, display = NOT_FOUND) => ({
  id,
  display,
});
