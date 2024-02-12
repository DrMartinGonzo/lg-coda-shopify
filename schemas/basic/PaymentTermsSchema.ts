import * as coda from '@codahq/packs-sdk';
import { PaymentSchedulesSchema } from './PaymentSchedulesSchema';

// The terms and conditions under which a payment should be processed.
export const PaymentTermsSchema = coda.makeObjectSchema({
  properties: {
    amount: { type: coda.ValueType.Number, description: 'The amount that is owed according to the payment terms.' },
    currency: { type: coda.ValueType.String, description: 'The presentment currency for the payment.' },
    payment_terms_name: {
      type: coda.ValueType.String,
      description: 'The name of the selected payment terms template for the order.',
    },
    payment_terms_type: {
      type: coda.ValueType.String,
      description: 'e type of selected payment terms template for the order.',
    },
    due_in_days: {
      type: coda.ValueType.Number,
      description:
        'The number of days between the invoice date and due date that is defined in the selected payment terms template.',
    },
    payment_schedules: {
      type: coda.ValueType.Array,
      items: PaymentSchedulesSchema,
      description: 'An array of schedules associated to the payment terms.',
    },
  },
  displayProperty: 'payment_terms_name',
});
