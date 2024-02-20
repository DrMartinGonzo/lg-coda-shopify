import * as coda from '@codahq/packs-sdk';

/**
 * A configured metafield definition validation.
 * For example, for a metafield definition of number_integer type, you can set a
 * validation with the name max and a value of 15. This validation will ensure
 * that the value of the metafield is a number less than or equal to 15.
 */
export const ValidationSchema = coda.makeObjectSchema({
  properties: {
    name: { type: coda.ValueType.String, description: 'The validation name.' },
    type: { type: coda.ValueType.String, description: 'The name for the metafield type of this validation.' },
    value: { type: coda.ValueType.String, description: 'The validation value.' },
  },
  displayProperty: 'name',
});
