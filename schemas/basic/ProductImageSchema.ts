import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';

export const ProductImageSchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('product image'),
    created_at: PROPS.makeCreatedAtProp('product image'),
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
      ...PROPS.ID_NUMBER,
      description: 'The ID of the product associated with the image.',
    },
    src: {
      type: coda.ValueType.String,
      description: 'Specifies the location of the product image.',
    },
    updated_at: PROPS.makeUpdatedAtProp('product image'),
    variant_ids: {
      type: coda.ValueType.Array,
      items: PROPS.ID_NUMBER,
      description: 'An array of variant IDs associated with the image.',
    },
    width: { type: coda.ValueType.Number, description: 'Width dimension of the image which is determined on upload.' },
  },
  displayProperty: 'src',
});
