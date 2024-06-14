import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';

export const TranslationSyncTableSchema = coda.makeObjectSchema({
  properties: {
    id: {
      ...PROPS.STRING,
      required: true,
      description: `A generated id for the translation.`,
    },
    resourceId: {
      ...PROPS.ID_NUMBER,
      required: true,
      fromKey: 'resourceId',
      fixedId: 'resourceId',
      description: 'The ID of the resource that the translation belongs to.',
    },
    // TODO: too hard to get the correct url for now
    // admin_url: PROPS.makeAdminUrlProp('translation'),
    key: {
      ...PROPS.STRING,
      fixedId: 'key',
      description: 'On the resource that this translation belongs to, the reference to the value being translated.',
    },
    originalValue: {
      ...PROPS.STRING,
      fixedId: 'originalValue',
      description: 'The translatable content value in the shop default locale.',
    },
    translatedValue: {
      ...PROPS.STRING,
      fixedId: 'translatedValue',
      mutable: true,
      description: 'The translatable content value in the target locale.',
    },
    locale: {
      ...PROPS.STRING,
      fixedId: 'locale',
      description: 'The locale of the translation.',
    },
    outdated: {
      ...PROPS.BOOLEAN,
      fixedId: 'outdated',
      description: 'Whether the original content has changed since this translation was updated.',
    },
    resourceType: { ...PROPS.STRING, fixedId: 'resourceType' },
    type: { ...PROPS.STRING, fixedId: 'type', description: 'Type of the translatable content.' },
    updated_at: PROPS.makeUpdatedAtProp('translation'),
  },
  idProperty: 'id',
  displayProperty: 'key',
  featuredProperties: ['id', 'locale', 'resourceType', 'key', 'originalValue', 'translatedValue', 'outdated'],
});
