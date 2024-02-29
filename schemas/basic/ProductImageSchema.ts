import * as coda from '@codahq/packs-sdk';

export const ProductImageSchema = coda.makeObjectSchema({
  properties: {
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      useThousandsSeparator: false,
      required: true,
      description: 'The ID of the product image.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the product image was created.',
    },
    height: {
      type: coda.ValueType.Number,
      description: 'Height dimension of the image which is determined on upload.',
    },
    position: {
      type: coda.ValueType.Number,
      description:
        'The order of the product image in the list. The first product image is at position 1 and is the "main" image for the product.',
    },
    product_id: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      description: 'The ID of the product associated with the image.',
    },
    src: {
      type: coda.ValueType.String,
      description: 'Specifies the location of the product image.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the product image was last modified.',
    },
    variant_ids: {
      type: coda.ValueType.Array,
      items: { type: coda.ValueType.Number, useThousandsSeparator: false },
      description: 'An array of variant IDs associated with the image.',
    },
    width: { type: coda.ValueType.Number, description: 'Width dimension of the image which is determined on upload.' },
  },
  displayProperty: 'src',
});
