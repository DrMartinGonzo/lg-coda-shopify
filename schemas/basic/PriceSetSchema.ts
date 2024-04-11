import * as coda from '@codahq/packs-sdk';
import { MoneySchema } from './MoneySchema';

export const PriceSetSchema = coda.makeObjectSchema({
  properties: {
    shop_money: MoneySchema,
    presentment_money: MoneySchema,
  },
  displayProperty: 'shop_money',
});
