import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';
import { CollectionReference } from './CollectionSchema';
import { ProductReference } from './ProductSchema';

export const CollectSyncTableSchema = coda.makeObjectSchema({
  properties: {
    //! admin_graphql_api_id DOES NOT EXIST
    id: PROPS.makeRequiredIdNumberProp('collect'),
    collection_id: {
      ...PROPS.ID_NUMBER,
      fromKey: 'collection_id',
      fixedId: 'collection_id',
      description: 'The ID of the custom collection containing the product.',
    },
    collection: {
      ...CollectionReference,
      fixedId: 'collection',
      description: 'Relation to the related collection.',
    },
    created_at: PROPS.makeCreatedAtProp('collect'),
    position: {
      type: coda.ValueType.Number,
      fixedId: 'position',
      fromKey: 'position',
      description:
        'The position of this product in a manually sorted custom collection. The first position is 1. This value is applied only when the custom collection is sorted manually.',
    },
    product_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'product_id',
      fromKey: 'product_id',
      description: 'The unique numeric identifier for the product in the custom collection.',
    },
    product: {
      ...ProductReference,
      fixedId: 'product',
      description: 'Relation to the product in the custom collection.',
    },
    updated_at: PROPS.makeUpdatedAtProp('collect'),
  },
  displayProperty: 'id',
  idProperty: 'id',
  featuredProperties: ['id', 'collection', 'product', 'created_at', 'updated_at'],
});
