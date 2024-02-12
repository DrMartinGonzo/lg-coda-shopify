import * as coda from '@codahq/packs-sdk';

export const MeasurementSchema = coda.makeObjectSchema({
  properties: {
    display: { type: coda.ValueType.String },
    value: { type: coda.ValueType.Number },
    unit: { type: coda.ValueType.String },
  },
  displayProperty: 'display',
});
