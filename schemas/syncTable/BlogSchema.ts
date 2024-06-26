import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { OPTIONS_COMMENTABLE } from '../../constants/options-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { NOT_FOUND } from '../../constants/strings-constants';
import { FormatRowReferenceFn } from '../CodaRows.types';

export const BlogSyncTableSchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('blog'),
    admin_url: PROPS.makeAdminUrlProp('blog'),
    graphql_gid: PROPS.makeGraphQlGidProp('blog'),
    commentable: {
      ...PROPS.SELECT_LIST,
      fixedId: 'commentable',
      fromKey: 'commentable',
      mutable: true,
      description: 'Whether readers can post comments to the blog and if comments are moderated or not.',
      options: OPTIONS_COMMENTABLE,
      requireForUpdates: true,
    },
    created_at: PROPS.makeCreatedAtProp('blog'),
    handle: {
      ...PROPS.makeHandleProp('blog'),
      mutable: true,
    },
    tags: {
      ...PROPS.makeTagsProp(),
      description: 'A list of tags associated with the 200 most recent blog articles.',
    },
    template_suffix: {
      ...PROPS.makeTemplateSuffixProp('blog'),
      mutable: true,
    },
    title: {
      ...PROPS.makeTitleProp('blog'),
      required: true,
      mutable: true,
    },
    updated_at: {
      ...PROPS.makeUpdatedAtProp('blog'),
      description:
        PROPS.makeUpdatedAtProp('blog').description +
        'Note that this is not updated when creating, modifying or deleting articles in the blog.',
    },
  },
  displayProperty: 'title',
  idProperty: 'id',
  // admin_url will be the last featured property, added in Blogs dynamicOptions after the eventual metafields
  featuredProperties: ['title', 'handle', 'tags'],

  // Card fields.
  subtitleProperties: ['handle', 'tags', 'commentable', 'template_suffix'],
  linkProperty: 'admin_url',
});

export const BlogReference = coda.makeReferenceSchemaFromObjectSchema(BlogSyncTableSchema, PACK_IDENTITIES.Blog);
export const formatBlogReference: FormatRowReferenceFn<number, 'title'> = (id: number, title = NOT_FOUND) => ({
  id,
  title,
});
