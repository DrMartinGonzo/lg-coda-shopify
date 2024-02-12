import * as coda from '@codahq/packs-sdk';
import { TaxLineSchema } from './TaxLineSchema';

export const DutySchema = coda.makeObjectSchema({
  properties: {
    duty_id: { type: coda.ValueType.Number, fromKey: 'id', useThousandsSeparator: false },
    tax_lines: { type: coda.ValueType.Array, items: TaxLineSchema },
    country_code_of_origin: { type: coda.ValueType.String },
    harmonized_system_code: { type: coda.ValueType.String },
    // admin_graphql_api_id: { type: coda.ValueType.String },
    // price: { type: coda.ValueType.Number },
  },
  displayProperty: 'duty_id',
});
