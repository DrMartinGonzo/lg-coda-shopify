import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';

export const DiscountApplicationSchema = coda.makeObjectSchema({
  properties: {
    allocation_method: {
      type: coda.ValueType.String,
      description:
        'The method by which the discount application value has been allocated to entitled lines. Valid values\n:' +
        [
          '- across: The value is spread across all entitled lines.',
          '- each: The value is applied onto every entitled line.',
          '- one: The value is applied onto a single line.',
        ].join('\n'),
    },
    amount: {
      ...PROPS.CURRENCY,
      description: 'The applied amount of the discount.',
    },
    code: {
      type: coda.ValueType.String,
      description:
        'The discount code that was used to apply the discount. Available only for discount code applications.',
    },
    description: {
      type: coda.ValueType.String,
      description:
        'The description of the discount application, as defined by the merchant or the Shopify Script. Available only for manual and script discount applications.',
    },
    target_selection: {
      type: coda.ValueType.String,
      description:
        'The lines on the order, of the type defined by target_type, that the discount is allocated over. Valid values:\n' +
        [
          '- all: The discount is allocated onto all lines.',
          '- entitled: The discount is allocated only onto lines it is entitled for.',
          '- explicit: The discount is allocated onto explicitly selected lines.',
        ].join('\n'),
    },
    target_type: {
      type: coda.ValueType.String,
      description:
        'The type of line on the order that the discount is applicable on. Valid values:\n' +
        [
          '- line_item: The discount applies to line items.',
          '- shipping_line: The discount applies to shipping lines.',
        ].join('\n'),
    },
    title: {
      type: coda.ValueType.String,
      description:
        'The title of the discount application, as defined by the merchant. Available only for manual discount applications.',
    },
    type: {
      type: coda.ValueType.String,
      description:
        'The discount application type. Valid values:\n' +
        [
          '- automatic: The discount was applied automatically, such as by a Buy X Get Y automatic discount.',
          '- discount_code: The discount was applied by a discount code.',
          '- manual: The discount was manually applied by the merchant (for example, by using an app or creating a draft order).',
          '- script: The discount was applied by a Shopify Script.',
        ].join('\n'),
    },
    value: {
      type: coda.ValueType.Number,
      description:
        'The value of the discount application as a decimal. This represents the intention of the discount application. For example, if the intent was to apply a 20% discount, then the value will be 20.0. If the intent was to apply a $15 discount, then the value will be 15.0.',
    },
    value_type: {
      type: coda.ValueType.String,
      description:
        'The type of the value. Valid values:\n' +
        [
          '- fixed_amount: A fixed amount discount value in the currency of the order.',
          '- percentage: A percentage discount value.',
        ].join('\n'),
    },
  },
  displayProperty: 'value_type',
});
