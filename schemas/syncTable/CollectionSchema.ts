import * as coda from '@codahq/packs-sdk';
import { NOT_FOUND } from '../../constants';
import { CollectionRuleSetSchema } from '../basic/CollectionRuleSetSchema';
import { SmartCollectionRuleSchema } from '../basic/SmartCollectionRuleSchema';
import { Identity } from '../../constants';

import type { FieldDependency } from '../Schema.types';

export const CollectionSyncTableSchema = coda.makeObjectSchema({
  properties: {
    /**
     * ! Deprecated
     */
    /**
     * Disabled
     */
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      fixedId: 'graphql_gid',
      description: 'The GraphQL GID of the collection.',
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'admin_url',
      description: 'A link to the collection in the Shopify admin.',
    },

    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'id',
      required: true,
      useThousandsSeparator: false,
      description: 'The ID for the collection.',
    },

    body: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Html,
      fixedId: 'body',
      description:
        'Text-only description of the collection, stripped of any HTML tags and formatting that were included.',
    },
    body_html: {
      type: coda.ValueType.String,
      fixedId: 'body_html',
      fromKey: 'body_html',
      mutable: true,
      description: 'The description of the collection, including any HTML tags and formatting.',
    },
    handle: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'handle',
      fromKey: 'handle',
      description: 'A unique string that identifies the collection.',
    },
    // image: {
    //   type: coda.ValueType.String,
    //   codaType: coda.ValueHintType.ImageReference,
    //   description: 'The image associated with the collection.',
    //   fixedId: 'image',
    // },
    image_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageReference,
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
    // TODO: maybe thumbnails are never needed ?
    // thumbnail: {
    //   type: coda.ValueType.String,
    //   codaType: coda.ValueHintType.ImageReference,
    //   description: `The thumbnail (${DEFAULT_THUMBNAIL_SIZE}x${DEFAULT_THUMBNAIL_SIZE}px) image associated with the collection.`,
    // },
    published: {
      type: coda.ValueType.Boolean,
      codaType: coda.ValueHintType.Toggle,
      mutable: true,
      fixedId: 'published',
      fromKey: 'published',
      description: 'Whether the collection is visible.',
    },
    published_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'published_at',
      fromKey: 'published_at',
      description: 'The time and date when the collection was made visible',
    },
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

    ruleSet: CollectionRuleSetSchema,

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
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      fixedId: 'template_suffix',
      fromKey: 'template_suffix',
      mutable: true,
      requireForUpdates: false,
      options: coda.OptionsType.Dynamic,
      description: 'The suffix of the Liquid template being used to show the collection in an online store.',
    },
    title: {
      type: coda.ValueType.String,
      mutable: true,
      required: true,
      fixedId: 'title',
      fromKey: 'title',
      description: 'The name of the collection.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description: 'The date and time when the collection was last modified.',
    },
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
export const collectionFieldDependencies: FieldDependency<typeof CollectionSyncTableSchema.properties>[] = [
  {
    field: 'image',
    dependencies: ['image_url', 'image_alt_text'],
  },
  {
    field: 'id',
    dependencies: ['admin_url'],
  },
];

export const CollectionReference = coda.makeReferenceSchemaFromObjectSchema(
  CollectionSyncTableSchema,
  Identity.Collection
);
export const formatCollectionReference = (id: number, title = NOT_FOUND) => ({ id, title });
