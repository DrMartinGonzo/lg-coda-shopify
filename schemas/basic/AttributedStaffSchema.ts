import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const AttributedStaffSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: PROPS.makeGraphQlGidProp('staff member', 'id'),
    quantity: {
      type: coda.ValueType.Number,
      fixedId: 'quantity',
      fromKey: 'quantity',
      description: 'The quantity of the line item attributed to the staff member.',
    },
  },
});
