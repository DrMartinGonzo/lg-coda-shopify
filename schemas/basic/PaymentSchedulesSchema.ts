import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';

// Schedules associated to payment terms.
export const PaymentSchedulesSchema = coda.makeObjectSchema({
  properties: {
    amount: { type: coda.ValueType.Number, description: 'The amount that is owed according to the payment terms.' },
    currency: { type: coda.ValueType.String, description: 'The presentment currency for the payment.' },
    issued_at: {
      ...PROPS.DATETIME_STRING,
      description: 'The date and time when the payment terms were initiated.',
    },
    due_at: {
      ...PROPS.DATETIME_STRING,
      description:
        'The date and time when the payment is due. Calculated based on issued_at and due_in_days or a customized fixed date if the type is fixed.',
    },
    completed_at: {
      ...PROPS.DATETIME_STRING,
      description:
        'The date and time when the purchase is completed. Returns null initially and updates when the payment is captured.',
    },
    expected_payment_method: { type: coda.ValueType.String, description: 'The name of the payment method gateway.' },
  },
  displayProperty: 'amount',
});
