import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { NOT_FOUND } from '../../constants/strings-constants';
import { FormatRowReferenceFn } from '../CodaRows.types';
import { BlogReference } from './BlogSchema';

export const ArticleSyncTableSchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('article'),
    graphql_gid: PROPS.makeGraphQlGidProp('article'),
    admin_url: PROPS.makeAdminUrlProp('article'),
    // Pas possible sans faire de requête supplémentaire pour récupérer le handle du blog à partir de blog_id
    // store_url: {
    //   ...PROPS.LINK,
    //   fixedId: 'store_url',
    //   description: 'A link to the article in the online shop.',
    // },
    author: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'author',
      fromKey: 'author',
      description: 'The name of the author of the article.',
    },
    blog_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'blog_id',
      fromKey: 'blog_id',
      mutable: true,
      description: 'The ID of the blog containing the article.',
    },
    blog: {
      ...BlogReference,
      mutable: true,
      fixedId: 'blog',
      requireForUpdates: true,
      description: 'A relation to the blog containing the article.',
    },
    body: PROPS.makeBodyProp('article'),
    body_html: { ...PROPS.makeBodyHtmlProp('article'), mutable: true },
    created_at: PROPS.makeCreatedAtProp('article'),
    handle: {
      ...PROPS.makeHandleProp('article'),
      mutable: true,
    },
    image_url: {
      ...PROPS.IMAGE_REF,
      mutable: true,
      fixedId: 'image_url',
      description: 'An image associated with the article.',
    },
    image_alt_text: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'image_alt_text',
      description: `Alternative text that describes the image associated with the article.`,
    },
    published: {
      ...PROPS.makePublishedProp('article'),
      mutable: true,
    },
    published_at: { ...PROPS.makePublishedAtProp('article'), mutable: true },
    summary: {
      type: coda.ValueType.String,
      fixedId: 'summary',
      description:
        'Text-only content of the summary of the article, stripped of any HTML tags and formatting that were included.',
    },
    summary_html: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'summary_html',
      fromKey: 'summary_html',
      description:
        'A summary of the article, which can include HTML markup. The summary is used by the online store theme to display the article on other pages, such as the home page or the main blog page.',
    },
    tags: {
      ...PROPS.makeTagsProp('article'),
      mutable: true,
    },
    template_suffix: {
      ...PROPS.makeTemplateSuffixProp('article'),
      mutable: true,
    },
    title: {
      ...PROPS.makeTitleProp('article'),
      required: true,
      mutable: true,
    },
    updated_at: PROPS.makeUpdatedAtProp('article'),
    user_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'user_id',
      fromKey: 'user_id',
      description: 'A unique numeric identifier for the author of the article.',
    },
  },
  displayProperty: 'title',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Articles dynamicOptions after the eventual metafields
  featuredProperties: ['title', 'body_html', 'published'],

  // Card fields.
  subtitleProperties: ['author', 'published_at', 'tags', 'template_suffix'],
  snippetProperty: 'body',
  imageProperty: 'image_url',
  linkProperty: 'admin_url',
});

export const ArticleReference = coda.makeReferenceSchemaFromObjectSchema(
  ArticleSyncTableSchema,
  PACK_IDENTITIES.Article
);
export const formatArticleReference: FormatRowReferenceFn<number, 'title'> = (id: number, title = NOT_FOUND) => ({
  id,
  title,
});
