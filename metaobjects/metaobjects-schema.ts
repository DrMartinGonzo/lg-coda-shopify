import * as coda from '@codahq/packs-sdk';

import { FIELD_TYPES, IDENTITY_METAOBJECT, PACK_ID } from '../constants';
import { ProductReference } from '../products/products-schema';
import { PageReference } from '../pages/pages-schema';
import { CollectionReference } from '../collections/collections-schema';
import { ProductVariantReference } from '../productVariants/productVariants-schema';
import { FileReference } from '../files/files-schema';
import { getUnitMap } from '../helpers';

import type { MetafieldDefinition, MetaobjectFieldDefinition } from '../types/admin.types';

export const MeasurementSchema = coda.makeObjectSchema({
  properties: {
    display: { type: coda.ValueType.String },
    value: { type: coda.ValueType.Number },
    unit: { type: coda.ValueType.String },
  },
  displayProperty: 'display',
});

// export const MetaObjectSchema = coda.makeObjectSchema({
//   properties: {
//     gid: { type: coda.ValueType.String, required: true },
//     handle: { type: coda.ValueType.String, required: true },
//     name: { type: coda.ValueType.String },
//     type: { type: coda.ValueType.String },
//     data: { type: coda.ValueType.String },
//   },
//   displayProperty: 'name',
//   idProperty: 'gid',
//   featuredProperties: ['gid', 'handle', 'name', 'type', 'data'],
// });

// const MetaObjectBaseSchema = coda.makeObjectSchema({
//   properties: {
//     metaobject_id: { type: coda.ValueType.String, fromKey: 'id', required: true },
//     handle: { type: coda.ValueType.String, required: true },
//   },
//   displayProperty: 'metaobject_id',
//   idProperty: 'metaobject_id',
//   featuredProperties: ['metaobject_id', 'handle'],
// });

export function getMetaobjectReferenceSchema(fieldDefinition) {
  const metaobjectReferenceDefinitionId = fieldDefinition.validations.find(
    (v) => v.name === 'metaobject_definition_id'
  )?.value;

  return coda.makeObjectSchema({
    codaType: coda.ValueHintType.Reference,
    properties: {
      graphql_gid: { type: coda.ValueType.String, required: true },
      name: { type: coda.ValueType.String, required: true },
    },
    displayProperty: 'name',
    idProperty: 'graphql_gid',
    identity: {
      packId: PACK_ID,
      name: IDENTITY_METAOBJECT,
      dynamicUrl: metaobjectReferenceDefinitionId,
    },
  });
}

export function mapMetaFieldToSchemaProperty(
  fieldDefinition: MetafieldDefinition | MetaobjectFieldDefinition
): coda.Schema & coda.ObjectSchemaProperty {
  const typeName = fieldDefinition.type.name;
  // Check if typeName begins with 'list.' which means it's an array
  // If it is, remove 'list.' from typeName to get 'raw' field type
  const isArray = typeName.startsWith('list.');
  const typeNameNoList = isArray ? typeName.replace('list.', '') : typeName;

  const baseProperty = {
    fromKey: fieldDefinition.key,
    description: fieldDefinition.description,
    fixedId: fieldDefinition.key,
  };

  // NON ARRAY PROPERTIES
  if (!isArray) {
    switch (typeName) {
      // TEXT
      case FIELD_TYPES.single_line_text_field:
      case FIELD_TYPES.multi_line_text_field:
      case FIELD_TYPES.json:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          mutable: true,
        };

      case FIELD_TYPES.rich_text_field:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          codaType: coda.ValueHintType.Html,
        };

      // MEASUREMENT
      case FIELD_TYPES.weight:
      case FIELD_TYPES.dimension:
      case FIELD_TYPES.volume:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          mutable: true,
          description: `${baseProperty.description ? '\n' : ''}Valid units are ${Object.values(
            getUnitMap(typeNameNoList)
          ).join(', ')}.`,
        };

      // URL
      case FIELD_TYPES.url:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          codaType: coda.ValueHintType.Url,
          mutable: true,
        };

      // COLOR
      case FIELD_TYPES.color:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          mutable: true,
        };

      // RATING
      case FIELD_TYPES.rating:
        return {
          ...baseProperty,
          type: coda.ValueType.Number,
          // codaType: coda.ValueHintType.Scale,
          // maximum: maximumStr ? parseFloat(maximumStr) : undefined,
          mutable: true,
        };

      // NUMBER
      case FIELD_TYPES.number_integer:
        return {
          ...baseProperty,
          type: coda.ValueType.Number,
          precision: 0,
          mutable: true,
        };
      case FIELD_TYPES.number_decimal:
        return {
          ...baseProperty,
          type: coda.ValueType.Number,
          mutable: true,
        };

      // MONEY
      case FIELD_TYPES.money:
        return {
          ...baseProperty,
          type: coda.ValueType.Number,
          codaType: coda.ValueHintType.Currency,
          mutable: true,
        };

      // TRUE_FALSE
      case FIELD_TYPES.boolean:
        return {
          ...baseProperty,
          type: coda.ValueType.Boolean,
          mutable: true,
        };

      // DATE_TIME
      case FIELD_TYPES.date:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          codaType: coda.ValueHintType.Date,
          mutable: true,
        };

      case FIELD_TYPES.date_time:
        return {
          ...baseProperty,
          type: coda.ValueType.String,
          codaType: coda.ValueHintType.DateTime,
          mutable: true,
        };

      // REFERENCE
      case FIELD_TYPES.collection_reference:
        return {
          ...baseProperty,
          ...CollectionReference,
          mutable: true,
        };
      case FIELD_TYPES.metaobject_reference:
        return {
          ...baseProperty,
          ...getMetaobjectReferenceSchema(fieldDefinition),
          mutable: true,
        };
      case FIELD_TYPES.page_reference:
        return {
          ...baseProperty,
          ...PageReference,
          mutable: true,
        };
      case FIELD_TYPES.product_reference:
        return {
          ...baseProperty,
          ...ProductReference,
          mutable: true,
        };
      case FIELD_TYPES.variant_reference:
        return {
          ...baseProperty,
          ...ProductVariantReference,
          mutable: true,
        };
      case FIELD_TYPES.file_reference:
        return {
          ...baseProperty,
          ...FileReference,
          mutable: true,
        };

      default:
        return { ...baseProperty, type: coda.ValueType.String };
    }
  }
  // ARRAY PROPERTIES
  else {
    switch (typeName) {
      case FIELD_TYPES.list_single_line_text_field:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String },
        } as coda.Schema & coda.ObjectSchemaProperty;
      case FIELD_TYPES.list_weight:
      case FIELD_TYPES.list_dimension:
      case FIELD_TYPES.list_volume:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String },
          description: `${baseProperty.description ? '\n' : ''}Valid units are ${Object.values(
            getUnitMap(typeNameNoList)
          ).join(', ')}.`,
        };
      case FIELD_TYPES.list_url:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String, codaType: coda.ValueHintType.Url },
        };
      case FIELD_TYPES.list_color:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String },
        };
      case FIELD_TYPES.list_rating:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.Number },
        };
      case FIELD_TYPES.list_number_integer:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.Number, precision: 0 },
        };
      case FIELD_TYPES.list_number_decimal:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.Number },
        };
      case FIELD_TYPES.list_collection_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: CollectionReference,
          mutable: true,
        };
      case FIELD_TYPES.list_metaobject_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: getMetaobjectReferenceSchema(fieldDefinition),
          mutable: true,
        };
      case FIELD_TYPES.list_page_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: PageReference,
          mutable: true,
        };
      case FIELD_TYPES.list_product_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: ProductReference,
          mutable: true,
        };
      case FIELD_TYPES.list_variant_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: ProductVariantReference,
          mutable: true,
        };
      case FIELD_TYPES.list_file_reference:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: FileReference,
          mutable: true,
        };

      // DATE_TIME
      case FIELD_TYPES.list_date:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String, codaType: coda.ValueHintType.Date },
        };

      case FIELD_TYPES.list_date_time:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
        };

      default:
        return {
          ...baseProperty,
          type: coda.ValueType.Array,
          items: { type: coda.ValueType.String },
        };
    }
  }
}
