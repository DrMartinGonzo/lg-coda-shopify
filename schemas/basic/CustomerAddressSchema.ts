import * as coda from '@codahq/packs-sdk';
import { AddressSchema } from './AddressSchema';

export const CustomerAddressSchema = coda.makeObjectSchema({
  properties: {
    ...AddressSchema.properties,
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
      useThousandsSeparator: false,
      description: 'A unique identifier for the address.',
    },
    default: { type: coda.ValueType.Boolean, description: 'Returns true for each default address.' },
  },
  displayProperty: 'display',
});
