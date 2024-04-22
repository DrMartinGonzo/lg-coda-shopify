import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';

export const RefundDutySchema = coda.makeObjectSchema({
  properties: {
    duty_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'duty_id',
      fromKey: 'duty_id',
      description: 'The unique identifier of the duty.',
    },
    refund_type: {
      type: coda.ValueType.String,
      fixedId: 'refund_type',
      fromKey: 'refund_type',
      description:
        'Specifies how you want the duty refunded.Valid values:\n' +
        [
          '- FULL: Refunds all the duties associated with a duty ID. You do not need to include refund line items if you are using the full refund type.',
          '- PROPORTIONAL: Refunds duties in proportion to the line item quantity that you want to refund. If you choose the proportional refund type, then you must also pass the refund line items to calculate the portion of duties to refund.',
        ].join('\n'),
    },
  },
  displayProperty: 'duty_id',
});
