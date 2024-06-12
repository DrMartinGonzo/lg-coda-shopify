import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';

export const TranslatableContentSyncTableSchema = coda.makeObjectSchema({
  properties: {
    id: {
      ...PROPS.STRING,
      required: true,
      description: `A generated id for the translation.`,
    },
    key: { type: coda.ValueType.String, fixedId: 'key' },
    value: { type: coda.ValueType.String, fixedId: 'value' },
    resourceType: { type: coda.ValueType.String, fixedId: 'resourceType' },
    resourceId: {
      ...PROPS.NUMBER,
      description: 'The id of the owner resource.',
      useThousandsSeparator: false,
    },
  },
  idProperty: 'id',
  displayProperty: 'key',
  // featuredProperties: ['translations', 'translatableContent'],
});
