import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';

// The marketing consent information when the customer consented to receiving marketing material by email. The email property is required to create a customer with email consent information and to update a customer for email consent that doesn't have an email recorded. The customer must have a unique email address associated to the record.
export const EmailMarketingConsentSchema = coda.makeObjectSchema({
  properties: {
    state: { type: coda.ValueType.String, description: 'The current email marketing state for the customer.' },
    opt_in_level: {
      type: coda.ValueType.String,
      description:
        'The marketing subscription opt-in level, as described in the M3AAWG Sender Best Common Practices, that the customer gave when they consented to receive marketing material by email.',
    },
    consent_updated_at: {
      ...PROPS.DATETIME_STRING,
      description: 'The date and time when the customer consented to receive marketing material by email.',
    },
  },
  displayProperty: 'state',
});
