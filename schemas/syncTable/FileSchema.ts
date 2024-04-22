import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';
import { NOT_FOUND, PACK_IDENTITIES } from '../../constants';
import { FormatRowReferenceFn } from '../CodaRows.types';

export const FileSyncTableSchema = coda.makeObjectSchema({
  properties: {
    name: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'name',
      fromKey: 'name',
      mutable: true,
      description: 'The name of the file including its extension.',
    },
    graphql_gid: { ...PROPS.makeGraphQlGidProp('file', 'id'), required: true },
    alt: {
      type: coda.ValueType.String,
      fixedId: 'alt',
      fromKey: 'alt',
      mutable: true,
      description: 'A word or phrase to describe the contents or the function of a file.',
    },
    createdAt: PROPS.makeCreatedAtProp('file', 'createdAt', 'createdAt'),
    updatedAt: PROPS.makeUpdatedAtProp('file', 'updatedAt', 'updatedAt'),
    preview: {
      ...PROPS.IMAGE_REF,
      fixedId: 'preview',
      description: 'The preview image for the file.',
    },
    mimeType: {
      type: coda.ValueType.String,
      fixedId: 'mimeType',
      description: "The file's MIME type.",
    },
    fileSize: {
      type: coda.ValueType.Number,
      fixedId: 'fileSize',
      useThousandsSeparator: false,
      description: 'The size of the original file in bytes.',
    },
    url: {
      ...PROPS.LINK,
      fixedId: 'url',
      description: 'The location of the file as a URL.',
    },
    width: {
      type: coda.ValueType.Number,
      fixedId: 'width',
      useThousandsSeparator: false,
      description: 'The original width of the image/video in pixels.',
    },
    height: {
      type: coda.ValueType.Number,
      fixedId: 'height',
      useThousandsSeparator: false,
      description: 'The original height of the image/video in pixels.',
    },
    duration: {
      type: coda.ValueType.Number,
      fixedId: 'duration',
      useThousandsSeparator: false,
      description: "The video's duration in milliseconds.",
    },
    type: {
      type: coda.ValueType.String,
      fixedId: 'type',
      description: 'The type of file.',
    },
  },
  displayProperty: 'name',
  idProperty: 'graphql_gid',
  featuredProperties: ['name', 'preview', 'url'],

  // Card fields.
  subtitleProperties: ['mimeType', 'fileSize', 'createdAt'],
  snippetProperty: 'alt',
  imageProperty: 'preview',
  linkProperty: 'url',
});

export const FileReference = coda.makeReferenceSchemaFromObjectSchema(FileSyncTableSchema, PACK_IDENTITIES.File);
export const formatFileReference: FormatRowReferenceFn<string, 'name'> = (id: string, name = NOT_FOUND) => ({
  id,
  name,
});
