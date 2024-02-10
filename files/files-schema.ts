import * as coda from '@codahq/packs-sdk';
import { IDENTITY_FILE } from '../constants';

export const FileSchema = coda.makeObjectSchema({
  properties: {
    name: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'name',
      fromKey: 'name',
      mutable: true,
      description: 'The name of the file including its extension.',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'graphql_gid',
      fromKey: 'id',
    },
    alt: {
      type: coda.ValueType.String,
      fixedId: 'alt',
      fromKey: 'alt',
      mutable: true,
      description: 'The alternative text description of the file.',
    },
    createdAt: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'createdAt',
    },
    updatedAt: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updatedAt',
    },
    thumbnail: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.ImageReference,
      fixedId: 'thumbnail',
    },
    mimeType: {
      type: coda.ValueType.String,
      fixedId: 'mimeType',
    },
    fileSize: {
      type: coda.ValueType.Number,
      fixedId: 'fileSize',
    },
    url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'url',
    },
    width: {
      type: coda.ValueType.Number,
      fixedId: 'width',
    },
    height: {
      type: coda.ValueType.Number,
      fixedId: 'height',
    },
    duration: {
      type: coda.ValueType.Number,
      fixedId: 'duration',
    },
    type: {
      type: coda.ValueType.String,
      fixedId: 'type',
    },
  },
  displayProperty: 'name',
  idProperty: 'graphql_gid',
  featuredProperties: ['name', 'thumbnail', 'url'],
});

export const FileReference = coda.makeReferenceSchemaFromObjectSchema(FileSchema, IDENTITY_FILE);
