import * as coda from '@codahq/packs-sdk';

const CollectionRuleSchema = coda.makeObjectSchema({
  properties: {
    column: { type: coda.ValueType.String },
    condition: { type: coda.ValueType.String },
    relation: { type: coda.ValueType.String },
  },
  // displayProperty: 'relation',
});
export const CollectionRuleSetSchema = coda.makeObjectSchema({
  properties: {
    display: { type: coda.ValueType.String },
    rules: { type: coda.ValueType.Array, items: CollectionRuleSchema },
    appliedDisjunctively: { type: coda.ValueType.Boolean },
  },
  displayProperty: 'display',
});
