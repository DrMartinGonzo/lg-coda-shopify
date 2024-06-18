import * as coda from '@codahq/packs-sdk';
import { TranslationSchema } from '../basic/TranslationSchema.unused';

export const TranslatableResourceSyncTableSchema = coda.makeObjectSchema({
  properties: {
    translatableResourceId: { type: coda.ValueType.String, fromKey: 'resourceId', fixedId: 'translatableResourceId' },
    translations: { type: coda.ValueType.Array, items: TranslationSchema, fixedId: 'translations' },
    translatableContent: { type: coda.ValueType.Array, items: TranslationSchema, fixedId: 'translatableContent' },
  },
  idProperty: 'translatableResourceId',
  featuredProperties: ['translations', 'translatableContent'],
});
