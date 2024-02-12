import * as coda from '@codahq/packs-sdk';

// The marketing consent information when the customer consented to receiving marketing material by SMS. The phone property is required to create a customer with SMS consent information and to perform an SMS update on a customer that doesn't have a phone number recorded. The customer must have a unique phone number associated to the record.
export const SmsMarketingConsentSchema = coda.makeObjectSchema({
  properties: {
    state: { type: coda.ValueType.String, description: 'The current SMS marketing state for the customer.' },
    opt_in_level: {
      type: coda.ValueType.String,
      description:
        'The marketing subscription opt-in level, as described in the M3AAWG Sender Best Common Practices, that the customer gave when they consented to receive marketing material by SMS.',
    },
    consent_updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the customer consented to receive marketing material by SMS.',
    },
    consent_collected_from: {
      type: coda.ValueType.String,
      description: 'The source for whether the customer has consented to receive marketing material by SMS.',
    },
  },
  displayProperty: 'state',
});
