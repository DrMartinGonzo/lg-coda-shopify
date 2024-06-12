import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';
import { NOT_FOUND, PACK_IDENTITIES } from '../../constants';
import { FormatRowReferenceFn } from '../CodaRows.types';

export const PageSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: PROPS.makeAdminUrlProp('page'),
    shop_url: {
      ...PROPS.LINK,
      fixedId: 'shop_url',
      description: 'A link to the page in the oniine shop.',
    },
    graphql_gid: PROPS.makeGraphQlGidProp('page'),
    id: PROPS.makeRequiredIdNumberProp('page'),
    body: PROPS.makeBodyProp('page'),
    body_html: { ...PROPS.makeBodyHtmlProp('page'), mutable: true },
    handle: {
      ...PROPS.makeHandleProp('page'),
      mutable: true,
    },
    author: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'author',
      fromKey: 'author',
      description: 'The name of the person who created the page.',
    },
    title: {
      ...PROPS.makeTitleProp('page'),
      required: true,
      mutable: true,
    },
    template_suffix: {
      ...PROPS.SELECT_LIST,
      fixedId: 'template_suffix',
      fromKey: 'template_suffix',
      mutable: true,
      requireForUpdates: false,
      options: coda.OptionsType.Dynamic,
      description:
        'The suffix of the template that is used to render the page. If the value is an empty string or null, then the default page template is used.',
    },
    created_at: PROPS.makeCreatedAtProp('page'),
    updated_at: PROPS.makeUpdatedAtProp('page'),
    published: {
      ...PROPS.makePublishedProp('page'),
      mutable: true,
    },
    published_at: { ...PROPS.makePublishedAtProp('page'), mutable: true },
  },
  displayProperty: 'title',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Pages dynamicOptions after the eventual metafields
  featuredProperties: ['title', 'author', 'handle', 'template_suffix'],

  // Card fields.
  subtitleProperties: ['author', 'handle', 'created_at'],
  snippetProperty: 'body',
  linkProperty: 'admin_url',
});

export const PageReference = coda.makeReferenceSchemaFromObjectSchema(PageSyncTableSchema, PACK_IDENTITIES.Page);
export const formatPageReference: FormatRowReferenceFn<number, 'title'> = (id: number, title = NOT_FOUND) => ({
  id,
  title,
});
