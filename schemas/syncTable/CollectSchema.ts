import * as coda from '@codahq/packs-sdk';

import { ProductReference } from './ProductSchemaRest';
import { FieldDependency } from '../../types/tableSync';
import { CollectionReference } from './CollectionSchema';

export const CollectSchema = coda.makeObjectSchema({
  properties: {
    //! admin_graphql_api_id DOES NOT EXIST
    collect_id: {
      type: coda.ValueType.Number,
      required: true,
      fromKey: 'id',
      fixedId: 'collect_id',
      useThousandsSeparator: false,
    },
    collection_id: {
      type: coda.ValueType.Number,
      fromKey: 'collection_id',
      fixedId: 'collection_id',
      useThousandsSeparator: false,
      description: 'The ID of the custom collection containing the product.',
    },
    collection: {
      ...CollectionReference,
      fixedId: 'collection',
      description: 'Relation to the related collection.',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'created_at',
      fromKey: 'created_at',
      description: 'The date and time when the collect was created.',
    },
    position: {
      type: coda.ValueType.Number,
      fixedId: 'position',
      fromKey: 'position',
      description:
        'The position of this product in a manually sorted custom collection. The first position is 1. This value is applied only when the custom collection is sorted manually.',
    },
    product_id: {
      type: coda.ValueType.Number,
      fixedId: 'product_id',
      fromKey: 'product_id',
      useThousandsSeparator: false,
      description: 'The unique numeric identifier for the product in the custom collection.',
    },
    product: {
      ...ProductReference,
      fixedId: 'product',
      description: 'Relation to the product in the custom collection.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updated_at',
      fromKey: 'updated_at',
      description: 'The date and time when the collect was last updated.',
    },
  },
  displayProperty: 'collect_id',
  idProperty: 'collect_id',
  featuredProperties: ['collect_id', 'collection', 'product', 'created_at', 'updated_at'],
});
export const collectFieldDependencies: FieldDependency<typeof CollectSchema.properties>[] = [
  {
    field: 'product_id',
    dependencies: ['product'],
  },
  {
    field: 'collection_id',
    dependencies: ['collection'],
  },
  {
    field: 'published_at',
    dependencies: ['published'],
  },
];
