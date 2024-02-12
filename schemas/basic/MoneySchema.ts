import * as coda from '@codahq/packs-sdk';

export const MoneySchema = coda.makeObjectSchema({
  properties: {
    amount: { type: coda.ValueType.Number, description: 'Decimal money amount.' },
    currency_code: { type: coda.ValueType.String, description: 'Currency of the money.' },
  },
  displayProperty: 'amount',
});
