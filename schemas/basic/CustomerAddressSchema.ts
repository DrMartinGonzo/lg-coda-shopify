import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { AddressSchema } from './AddressSchema';

export const CustomerAddressSchema = coda.makeObjectSchema({
  properties: {
    ...AddressSchema.properties,
    id: PROPS.makeRequiredIdNumberProp('address'),
    default: { type: coda.ValueType.Boolean, description: 'Returns true for each default address.', required: true },
  },
  displayProperty: 'display',
});
