import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';

export const ExtendedAuthorizationAttributesSchema = coda.makeObjectSchema({
  properties: {
    standard_authorization_expires_at: {
      ...PROPS.DATETIME_STRING,
      fixedId: 'standard_authorization_expires_at',
      fromKey: 'standard_authorization_expires_at',
      description: 'The time after which capture will incur an additional fee.',
    },
    extended_authorization_expires_at: {
      ...PROPS.DATETIME_STRING,
      fixedId: 'extended_authorization_expires_at',
      fromKey: 'extended_authorization_expires_at',
      description:
        'The time after which the extended authorization expires. After the expiry, the merchant is unable to capture the payment.',
    },
  },
});
