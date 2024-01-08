import * as coda from '@codahq/packs-sdk';

import { FIELD_TYPES, IDENTITY_METAOBJECT, IDENTITY_PRODUCT, PACK_ID } from '../constants';
import { ProductReference } from '../products/products-schema';
import { PageReference } from '../pages/pages-schema';
import { CollectionReference } from '../collections/collections-schema';
import { ProductVariantReference } from '../productVariants/productVariants-schema';
import { FileReference } from '../files/files-schema';
import { getUnitMap } from '../helpers';

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

export function mapMetaobjectFieldToSchemaProperty(fieldDefinition) {
  const typeName = fieldDefinition.type.name;

  // Check if typeName begins with 'list.' which means it's an array
  // If it is, remove 'list.' from typeName to get 'raw' field type
  const isArray = typeName.startsWith('list.');
  const fieldType = isArray ? typeName.replace('list.', '') : typeName;

  let property = {
    fromKey: fieldDefinition.key,
    description: fieldDefinition.description,
    fixedId: fieldDefinition.key,
  } as coda.Schema & coda.ObjectSchemaProperty;

  let extraProps = {};
  switch (fieldType) {
    // TEXT
    case FIELD_TYPES.single_line_text_field:
    case FIELD_TYPES.multi_line_text_field:
    case FIELD_TYPES.json:
      extraProps = { type: coda.ValueType.String, mutable: true } as coda.StringSchema;
      break;

    case FIELD_TYPES.rich_text_field:
      extraProps = { type: coda.ValueType.String, codaType: coda.ValueHintType.Html } as coda.StringSchema;
      break;

    // MEASUREMENT
    case FIELD_TYPES.weight:
    case FIELD_TYPES.dimension:
    case FIELD_TYPES.volume:
      extraProps = {
        type: coda.ValueType.String,
        mutable: true,
      } as coda.StringSchema;
      property.description += `${property.description ? '\n' : ''}Valid units are ${Object.values(
        getUnitMap(fieldType)
      ).join(', ')}.`;
      break;

    // URL
    case FIELD_TYPES.url:
      extraProps = {
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.Url,
        mutable: true,
      } as coda.LinkSchema;
      break;

    // COLOR
    case FIELD_TYPES.color:
      extraProps = { type: coda.ValueType.String, mutable: true } as coda.StringSchema;
      break;

    // RATING
    case FIELD_TYPES.rating:
      // const maximumStr = fieldDefinition.validations.find((v) => v.name === 'scale_max')?.scale_max;
      extraProps = {
        type: coda.ValueType.Number,
        // codaType: coda.ValueHintType.Scale,
        // maximum: maximumStr ? parseFloat(maximumStr) : undefined,
        mutable: true,
      } as coda.NumberSchema;
      break;

    // NUMBER
    case FIELD_TYPES.number_integer:
      extraProps = {
        type: coda.ValueType.Number,
        precision: 0,
        mutable: true,
      } as coda.NumberSchema;
      break;
    case FIELD_TYPES.number_decimal:
      extraProps = {
        type: coda.ValueType.Number,
        mutable: true,
      } as coda.NumberSchema;
      break;

    // MONEY
    case FIELD_TYPES.money:
      extraProps = {
        type: coda.ValueType.Number,
        codaType: coda.ValueHintType.Currency,
        mutable: true,
      } as coda.CurrencySchema;
      break;

    // TRUE_FALSE
    case FIELD_TYPES.boolean:
      extraProps = {
        type: coda.ValueType.Boolean,
        mutable: true,
      } as coda.BooleanSchema;
      break;

    // REFERENCE
    case FIELD_TYPES.collection_reference:
      extraProps = { ...CollectionReference, mutable: true };
      break;
    case FIELD_TYPES.metaobject_reference:
      extraProps = { ...getMetaobjectReferenceSchema(fieldDefinition), mutable: true };
      break;
    case FIELD_TYPES.page_reference:
      extraProps = { ...PageReference, mutable: true };
      break;
    case FIELD_TYPES.product_reference:
      extraProps = { ...ProductReference, mutable: true };
      break;
    case FIELD_TYPES.variant_reference:
      extraProps = { ...ProductVariantReference, mutable: true };
      break;
    case FIELD_TYPES.file_reference:
      extraProps = { ...FileReference, mutable: true };
      break;

    // DATE_TIME
    case FIELD_TYPES.date:
      extraProps = {
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.Date,
        mutable: true,
      } as coda.StringDateSchema;
      break;

    case FIELD_TYPES.date_time:
      extraProps = {
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.DateTime,
        mutable: true,
      } as coda.StringDateTimeSchema;
      break;

    default:
      extraProps = { type: coda.ValueType.String } as coda.StringSchema;
      break;
  }

  if (isArray) {
    property = {
      ...property,
      type: coda.ValueType.Array,
      items: extraProps,
      mutable: extraProps['mutable'],
    } as coda.Schema & coda.ObjectSchemaProperty;
  } else {
    property = {
      ...property,
      ...extraProps,
    };
  }

  return property;
}
