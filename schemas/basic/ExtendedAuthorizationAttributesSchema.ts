import * as coda from '@codahq/packs-sdk';

export const ExtendedAuthorizationAttributesSchema = coda.makeObjectSchema({
  properties: {
    standard_authorization_expires_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'standard_authorization_expires_at',
      fromKey: 'standard_authorization_expires_at',
      description: 'The time after which capture will incur an additional fee.',
    },
    extended_authorization_expires_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'extended_authorization_expires_at',
      fromKey: 'extended_authorization_expires_at',
      description:
        'The time after which the extended authorization expires. After the expiry, the merchant is unable to capture the payment.',
    },
  },
});
