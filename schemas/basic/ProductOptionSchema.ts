import * as coda from '@codahq/packs-sdk';

export const ProductOptionSchema = coda.makeObjectSchema({
  properties: {
    // The date and time when the product image was created. The API returns this value in ISO 8601 format.
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
    },
    // A unique numeric identifier for the product image.
    product_image_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      required: true,
    },
    // The order of the product image in the list. The first product image is at position 1 and is the "main" image for the product.
    position: { type: coda.ValueType.Number },
    // The id of the product associated with the image.
    product_id: { type: coda.ValueType.Number },
    // An array of variant ids associated with the image.
    variant_ids: {
      type: coda.ValueType.Array,
      items: { type: coda.ValueType.Number },
    },
    // Specifies the location of the product image. This parameter supports URL filters that you can use to retrieve modified copies of the image. For example, add _small, to the filename to retrieve a scaled copy of the image at 100 x 100 px (for example, ipod-nano_small.png), or add _2048x2048 to retrieve a copy of the image constrained at 2048 x 2048 px resolution (for example, ipod-nano_2048x2048.png).
    src: { type: coda.ValueType.String },
    // Width dimension of the image which is determined on upload.
    width: { type: coda.ValueType.Number },
    // Height dimension of the image which is determined on upload.
    height: { type: coda.ValueType.Number },
    // The date and time when the product image was last modified. The API returns this value in ISO 8601 format.
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
    },
  },
  displayProperty: 'src',
});
