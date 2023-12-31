import * as coda from '@codahq/packs-sdk';
import { IDENTITY_FILE } from '../constants';

export const FileSchema = coda.makeObjectSchema({
  properties: {
    name: { type: coda.ValueType.String, required: true },
    file_id: { type: coda.ValueType.String, required: true, fromKey: 'id' },
    alt: { type: coda.ValueType.String },
    createdAt: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    updatedAt: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    thumbnail: { type: coda.ValueType.String, codaType: coda.ValueHintType.ImageReference },
    mimeType: { type: coda.ValueType.String },
    fileSize: { type: coda.ValueType.Number },
    url: { type: coda.ValueType.String, codaType: coda.ValueHintType.Url },
    width: { type: coda.ValueType.Number },
    height: { type: coda.ValueType.Number },
    duration: { type: coda.ValueType.Number },
    type: { type: coda.ValueType.String },
  },
  displayProperty: 'name',
  idProperty: 'file_id',
  featuredProperties: ['name', 'thumbnail', 'url'],
});

export const FileReference = coda.makeReferenceSchemaFromObjectSchema(FileSchema, IDENTITY_FILE);
