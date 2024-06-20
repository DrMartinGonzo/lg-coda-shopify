// #region Imports

import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import * as PROPS from '../coda/utils/coda-properties';
import { ResultOf } from '../graphql/utils/graphql-utils';

import { normalizeSchemaKey } from '@codahq/packs-sdk/dist/schema';
import { MetafieldDefinitionClient } from '../Clients/GraphQlClients';
import { ShopClient } from '../Clients/RestClients';
import { InvalidValueError, UnsupportedValueError } from '../Errors/Errors';
import {
  METAFIELD_LEGACY_TYPES,
  METAFIELD_TYPES,
  MetafieldLegacyType,
  MetafieldMeasurementType,
  MetafieldType,
} from '../constants/metafields-constants';
import { metafieldDefinitionFragment } from '../graphql/metafieldDefinitions-graphql';
import { metaobjectFieldDefinitionFragment } from '../graphql/metaobjectDefinition-graphql';
import { getUnitToLabelMapByMeasurementType } from '../models/utils/measurements-utils';
import {
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
  removeMetafieldTypeListPrefix,
} from '../models/utils/metafields-utils';
import { CurrencyCode, MetafieldDefinition as MetafieldDefinitionType, MetafieldOwnerType } from '../types/admin.types';
import { capitalizeFirstChar } from '../utils/helpers';
import { CollectionReference } from './syncTable/CollectionSchema';
import { FileReference } from './syncTable/FileSchema';
import { getMetaobjectReferenceSchema } from './syncTable/MetaObjectSchema';
import { PageReference } from './syncTable/PageSchema';
import { ProductReference } from './syncTable/ProductSchema';
import { ProductVariantReference } from './syncTable/ProductVariantSchema';

// #endregion

/**
 * Taken from Coda sdk
 */
export function transformToArraySchema(schema?: any) {
  if (schema?.type === coda.ValueType.Array) {
    return schema;
  } else {
    return {
      type: coda.ValueType.Array,
      items: schema,
    };
  }
}
/**
 * Make it easier if the caller simply passed in the full sync schema.
 * @param schema
 */
function requireObjectSchema(schema: coda.Schema): coda.GenericObjectSchema {
  let objectSchema = schema;
  if (objectSchema.type === coda.ValueType.Array) objectSchema = objectSchema.items;
  if (objectSchema.type !== coda.ValueType.Object) {
    throw new InvalidValueError('ObjectSchema', objectSchema);
  }
  return objectSchema;
}

export function extractFormulaContextFromParamsWIP(params: coda.ParamsList) {
  const but = params.map((param, index) => {
    return [param.name, params[index]];
  });
  return Object.fromEntries(but);
}

function isArrayProp(prop: coda.Schema & coda.ObjectSchemaProperty): prop is coda.ArraySchema {
  return 'type' in prop && prop?.type === coda.ValueType.Array;
}
function isCurrencyProp(prop: coda.Schema & coda.ObjectSchemaProperty): prop is coda.CurrencySchema {
  return 'codaType' in prop && prop?.codaType === coda.ValueHintType.Currency;
}

let shopCurrencyCode: CurrencyCode;
export async function updateCurrencyCodesInSchema<
  SchemaT extends coda.Schema & coda.ObjectSchemaDefinition<string, string>
>(baseSchema: SchemaT, context: coda.ExecutionContext) {
  const schema: SchemaT = { ...baseSchema };
  const properties = schema.properties;

  for (const key in properties) {
    let prop = properties[key];

    if (typeof prop !== 'object') continue;

    // Recursively call the function for nested properties
    if ('properties' in prop) {
      prop = await updateCurrencyCodesInSchema(prop, context);
    }

    // Call the function for nested arrays
    else if (isArrayProp(prop)) {
      prop = await updateCurrencyCodesInSchema(prop.items as any, context);
    }

    // Update currency code for currency properties
    else if (isCurrencyProp(prop)) {
      shopCurrencyCode = shopCurrencyCode ?? (await ShopClient.createInstance(context).activeCurrency());
      prop.currencyCode = shopCurrencyCode;
    }
  }

  return schema;
}

// #region Metafields in schema
export async function augmentSchemaWithMetafields<
  SchemaT extends coda.Schema & coda.ObjectSchemaDefinition<string, string>
>(baseSchema: SchemaT, ownerType: MetafieldOwnerType, context: coda.ExecutionContext) {
  const schema: SchemaT = { ...baseSchema };
  schema.featuredProperties = schema.featuredProperties ?? [];

  const metafieldDefinitionsData = await MetafieldDefinitionClient.createInstance(context).listForOwner({ ownerType });
  metafieldDefinitionsData.forEach((data) => {
    const property = mapMetaFieldToSchemaProperty(data);
    if (property) {
      const name = accents.remove(data.name);
      const propName = `Meta${capitalizeFirstChar(name)}`;
      property.displayName = `${data.name} [${getMetaFieldFullKey(data)}]`;
      schema.properties[propName] = property;
      // always feature metafields properties so that the user know they are synced
      schema.featuredProperties.push(propName);
    }
  });

  return updateCurrencyCodesInSchema(schema, context);
}

export function mapMetaFieldToSchemaProperty(
  fieldDefinition: ResultOf<typeof metafieldDefinitionFragment> | ResultOf<typeof metaobjectFieldDefinitionFragment>
): coda.Schema & coda.ObjectSchemaProperty {
  const type = fieldDefinition.type.name as MetafieldType | MetafieldLegacyType;
  /** description can be null for metaobjects and coda will complain the schema is invalid. I fnull we must set it to undefined */
  let description = fieldDefinition.description ?? undefined;
  const isMetaobjectFieldDefinition = !fieldDefinition.hasOwnProperty('namespace');

  let schemaKey = fieldDefinition.key;

  /**
   * Add full key to description for metafields, not metaobject fields
   * We prefix fromKey to be able to determine later wich columns are metafield values
   */
  if (!isMetaobjectFieldDefinition) {
    const fullKey = getMetaFieldFullKey(fieldDefinition as MetafieldDefinitionType);
    description = (description ? description + '\n' : '') + `field key: [${fullKey}]`;

    schemaKey = preprendPrefixToMetaFieldKey(fullKey);
  }

  const baseProperty = {
    description,
    fromKey: schemaKey,
    fixedId: schemaKey,
  };

  // Add eventual choices
  const choicesValidation = fieldDefinition.validations.find((v) => v.name === 'choices');
  if (choicesValidation && choicesValidation.value) {
    baseProperty['codaType'] = coda.ValueHintType.SelectList;
    baseProperty['options'] = JSON.parse(choicesValidation.value);
  }

  switch (type) {
    // Simple strings
    case METAFIELD_TYPES.color:
    case METAFIELD_TYPES.json:
    case METAFIELD_TYPES.multi_line_text_field:
    case METAFIELD_TYPES.single_line_text_field:
    case METAFIELD_LEGACY_TYPES.string:
    case METAFIELD_LEGACY_TYPES.json_string:
      return {
        ...baseProperty,
        ...PROPS.STRING,
        mutable: true,
      };
    case METAFIELD_TYPES.list_color:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: PROPS.STRING,
        mutable: true,
      };
    case METAFIELD_TYPES.list_single_line_text_field:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: PROPS.STRING,
      };

    // Rich text
    case METAFIELD_TYPES.rich_text_field:
      return {
        ...baseProperty,
        ...PROPS.HTML,
      };

    // MEASUREMENT
    case METAFIELD_TYPES.weight:
    case METAFIELD_TYPES.dimension:
    case METAFIELD_TYPES.volume:
      return {
        ...baseProperty,
        ...PROPS.STRING,
        mutable: true,
        description: `${baseProperty.description ? '\n' : ''}Valid units are ${Object.values(
          getUnitToLabelMapByMeasurementType(type)
        ).join(', ')}.`,
      };
    case METAFIELD_TYPES.list_weight:
    case METAFIELD_TYPES.list_dimension:
    case METAFIELD_TYPES.list_volume:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: PROPS.STRING,
        description: `${baseProperty.description ? '\n' : ''}Valid units are ${Object.values(
          getUnitToLabelMapByMeasurementType(removeMetafieldTypeListPrefix(type) as MetafieldMeasurementType)
        ).join(', ')}.`,
      };

    // URL
    case METAFIELD_TYPES.url:
      return {
        ...baseProperty,
        ...PROPS.LINK,
        mutable: true,
      };
    case METAFIELD_TYPES.list_url:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: PROPS.LINK,
      };

    // RATING
    case METAFIELD_TYPES.rating:
      return {
        ...baseProperty,
        ...PROPS.NUMBER,
        // codaType: coda.ValueHintType.Scale,
        // maximum: safeToFloat(maximumStr),
        mutable: true,
      };
    case METAFIELD_TYPES.list_rating:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: PROPS.NUMBER,
      };

    // NUMBER
    case METAFIELD_TYPES.number_integer:
      return {
        ...baseProperty,
        ...PROPS.NUMBER,
        precision: 0,
        mutable: true,
      };
    case METAFIELD_TYPES.list_number_integer:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { ...PROPS.NUMBER, precision: 0 },
      };

    case METAFIELD_TYPES.number_decimal:
      return {
        ...baseProperty,
        type: coda.ValueType.Number,
        mutable: true,
      };
    case METAFIELD_TYPES.list_number_decimal:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.Number },
      };

    // MONEY
    case METAFIELD_TYPES.money:
      return {
        ...baseProperty,
        ...PROPS.CURRENCY,
        mutable: true,
      };

    // TRUE_FALSE
    case METAFIELD_TYPES.boolean:
      return {
        ...baseProperty,
        ...PROPS.BOOLEAN,
        mutable: true,
      };

    // DATE_TIME
    case METAFIELD_TYPES.date:
      return {
        ...baseProperty,
        ...PROPS.DATE_STRING,
        mutable: true,
      };
    case METAFIELD_TYPES.list_date:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: PROPS.DATE_STRING,
      };

    case METAFIELD_TYPES.date_time:
      return {
        ...baseProperty,
        ...PROPS.DATETIME_STRING,
        mutable: true,
      };
    case METAFIELD_TYPES.list_date_time:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: PROPS.DATETIME_STRING,
      };

    // REFERENCES
    case METAFIELD_TYPES.collection_reference:
      return {
        ...baseProperty,
        ...CollectionReference,
        mutable: true,
      };
    case METAFIELD_TYPES.list_collection_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: CollectionReference,
        mutable: true,
      };

    case METAFIELD_TYPES.file_reference:
      return {
        ...baseProperty,
        ...FileReference,
        mutable: true,
      };
    case METAFIELD_TYPES.list_file_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: FileReference,
        mutable: true,
      };

    case METAFIELD_TYPES.metaobject_reference:
      return {
        ...baseProperty,
        ...getMetaobjectReferenceSchema(fieldDefinition),
        mutable: true,
      };
    case METAFIELD_TYPES.list_metaobject_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: getMetaobjectReferenceSchema(fieldDefinition),
        mutable: true,
      };

    case METAFIELD_TYPES.mixed_reference:
      return {
        ...baseProperty,
        description: '⚠️ We only support raw value for mixed references.\n' + baseProperty.description,
        ...PROPS.STRING,
        mutable: true,
      };
    case METAFIELD_TYPES.list_mixed_reference:
      return {
        ...baseProperty,
        description: '⚠️ We only support raw values for mixed references.\n' + baseProperty.description,
        type: coda.ValueType.Array,
        items: PROPS.STRING,
        mutable: true,
      };

    case METAFIELD_TYPES.page_reference:
      return {
        ...baseProperty,
        ...PageReference,
        mutable: true,
      };
    case METAFIELD_TYPES.list_page_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: PageReference,
        mutable: true,
      };

    case METAFIELD_TYPES.product_reference:
      return {
        ...baseProperty,
        ...ProductReference,
        mutable: true,
      };
    case METAFIELD_TYPES.list_product_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: ProductReference,
        mutable: true,
      };

    case METAFIELD_TYPES.variant_reference:
      return {
        ...baseProperty,
        ...ProductVariantReference,
        mutable: true,
      };
    case METAFIELD_TYPES.list_variant_reference:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: ProductVariantReference,
        mutable: true,
      };

    default:
      break;
  }

  throw new UnsupportedValueError('MetafieldType', type);
}
// #endregion

// #region Schema keys helpers
/**
 * Retrieve all object schema keys or fromKeys if present
 */
function retrieveObjectSchemaEffectiveKeys(schema: coda.Schema) {
  const objectSchema = requireObjectSchema(schema);
  const properties = objectSchema.properties;
  return Object.keys(properties).map((key) => getObjectSchemaEffectiveKey(objectSchema, key));
}

/**
 * Get a single object schema keys or fromKey if present
 */
export function getObjectSchemaEffectiveKey(schema: coda.Schema, key: string) {
  const objectSchema = requireObjectSchema(schema);
  const properties = objectSchema.properties;
  if (properties.hasOwnProperty(key)) {
    const property = properties[key];
    const propKey = property.hasOwnProperty('fromKey') ? property.fromKey : key;
    return propKey;
  }
  throw new Error(`Schema doesn't have ${key} property`);
}

export function getObjectSchemaNormalizedKey(schema: coda.Schema, fromKey: string) {
  const objectSchema = requireObjectSchema(schema);
  const properties = objectSchema.properties;
  let found = fromKey;
  Object.keys(properties).forEach((propKey) => {
    const property = properties[propKey];
    if (property.hasOwnProperty('fromKey') && property.fromKey === fromKey) {
      if (property.hasOwnProperty('fixedId')) {
        found = property.fixedId;
        return;
      }
    }
  });
  return normalizeSchemaKey(found);
}

export function getObjectSchemaRowKeys(schema: coda.Schema) {
  const objectSchema = requireObjectSchema(schema);
  const properties = objectSchema.properties;
  return Object.keys(properties).map((propKey) => {
    const property = properties[propKey];
    return property.hasOwnProperty('fixedId') ? property.fixedId : propKey;
  });
}
// #endregion
