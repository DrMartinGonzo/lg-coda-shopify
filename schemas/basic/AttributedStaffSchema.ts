import * as coda from '@codahq/packs-sdk';

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
export const AttributedStaffSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: {
      type: coda.ValueType.String,
      fixedId: 'graphql_gid',
      fromKey: 'id',
      description: 'The id of the staff member.',
    },
    quantity: {
      type: coda.ValueType.Number,
      fixedId: 'quantity',
      fromKey: 'quantity',
      description: 'The quantity of the line item attributed to the staff member.',
    },
  },
});
