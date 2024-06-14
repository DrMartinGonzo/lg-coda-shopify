import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { NOT_FOUND, PACK_IDENTITIES } from '../../constants';
import { FormatRowReferenceFn } from '../CodaRows.types';
import { SmartCollectionRuleSchema } from '../basic/SmartCollectionRuleSchema';

export const CollectionSyncTableSchema = coda.makeObjectSchema({
  properties: {
    /**
     * ! Deprecated
     */
    /**
     * Disabled
     */
    graphql_gid: PROPS.makeGraphQlGidProp('collection'),
    admin_url: PROPS.makeAdminUrlProp('collection'),
    id: PROPS.makeRequiredIdNumberProp('collection'),
    body: PROPS.makeBodyProp('collection', 'description'),
    body_html: { ...PROPS.makeBodyHtmlProp('collection', 'description'), mutable: true },
    handle: {
      ...PROPS.makeHandleProp('collection'),
      mutable: true,
    },
    // image: {
    //   ...PROPS.IMAGE_REF,
    //   description: 'The image associated with the collection.',
    //   fixedId: 'image',
    // },
    image_url: {
      ...PROPS.IMAGE_REF,
      fixedId: 'image_url',
      mutable: true,
      description: 'The image associated with the collection.',
    },
    image_alt_text: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'image_alt_text',
      description: `Alternative text that describes the image associated with the collection.`,
    },
    published: {
      ...PROPS.makePublishedProp('collection'),
      mutable: true,
    },
    published_at: PROPS.makePublishedAtProp('collection'),
    published_scope: {
      type: coda.ValueType.String,
      fixedId: 'published_scope',
      fromKey: 'published_scope',
      description: 'Whether the collection is published to the Point of Sale channel.',
    },
    rules: {
      type: coda.ValueType.Array,
      items: SmartCollectionRuleSchema,
      fixedId: 'rules',
      description:
        'For a smart (automated) collection, the list of rules that define what products go into the smart collection.',
    },

    // ruleSet: CollectionRuleSetSchema,

    disjunctive: {
      type: coda.ValueType.Boolean,
      fixedId: 'disjunctive',
      description:
        'For a smart (automated) collection, , whether the product must match all the rules to be included in the smart collection.',
    },
    sort_order: {
      type: coda.ValueType.String,
      fixedId: 'sort_order',
      fromKey: 'sort_order',
      description: 'The order in which products in the collection appear',
    },
    template_suffix: {
      ...PROPS.makeTemplateSuffixProp('collection'),
      mutable: true,
    },
    title: {
      ...PROPS.makeTitleProp('collection'),
      required: true,
      mutable: true,
    },
    updated_at: PROPS.makeUpdatedAtProp('collection'),
  },
  displayProperty: 'title',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Collections dynamicOptions after the eventual metafields
  featuredProperties: ['title', 'handle'],

  // Card fields.
  subtitleProperties: ['handle', 'published_at', 'published_scope', 'template_suffix'],
  snippetProperty: 'body',
  imageProperty: 'image_url',
  linkProperty: 'admin_url',
});

export const CollectionReference = coda.makeReferenceSchemaFromObjectSchema(
  CollectionSyncTableSchema,
  PACK_IDENTITIES.Collection
);

export const formatCollectionReference: FormatRowReferenceFn<number, 'title'> = (id: number, title = NOT_FOUND) => ({
  id,
  title,
});
