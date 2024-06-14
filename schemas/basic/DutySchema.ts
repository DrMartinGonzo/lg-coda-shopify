import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { TaxLineSchema } from './TaxLineSchema';

export const DutySchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('duty'),
    tax_lines: { type: coda.ValueType.Array, items: TaxLineSchema },
    country_code_of_origin: { type: coda.ValueType.String },
    harmonized_system_code: { type: coda.ValueType.String },
    // admin_graphql_api_id: { type: coda.ValueType.String },
    // price: { type: coda.ValueType.Number },
  },
  displayProperty: 'id',
});
