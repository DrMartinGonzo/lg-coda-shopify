import * as coda from '@codahq/packs-sdk';

export const CollectionImageSchema = coda.makeObjectSchema({
  properties: {
    // An image attached to a collection returned as Base64-encoded binary data.
    attachment: { type: coda.ValueType.String },
    // The source URL that specifies the location of the image.
    src: { type: coda.ValueType.String },
    // The alternative text that describes the collection image.
    alt: { type: coda.ValueType.String },
    // The width of the image in pixels.
    width: { type: coda.ValueType.Number },
    // The height of the image in pixels.
    height: { type: coda.ValueType.Number },
    // The time and date (ISO 8601 format) when the image was added to the collection.
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
  },
  displayProperty: 'src',
});
