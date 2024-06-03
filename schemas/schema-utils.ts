import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import * as PROPS from '../coda/coda-properties';
import { ResultOf } from '../utils/tada-utils';

import { UnsupportedValueError } from '../Errors/Errors';
import { METAFIELD_LEGACY_TYPES, METAFIELD_TYPES } from '../Resources/Mixed/METAFIELD_TYPES';
import { MetafieldHelper } from '../Resources/Mixed/MetafieldHelper';
import { Shop } from '../Resources/Rest/Shop';
import { metafieldDefinitionFragment } from '../graphql/metafieldDefinitions-graphql';
import { metaobjectFieldDefinitionFragment } from '../graphql/metaobjectDefinition-graphql';
import { CurrencyCode, MetafieldDefinition as MetafieldDefinitionType, MetafieldOwnerType } from '../types/admin.types';
import { capitalizeFirstChar, getUnitMap } from '../utils/helpers';
import { getMetaFieldFullKey, preprendPrefixToMetaFieldKey } from '../utils/metafields-utils';
import { getMetaobjectReferenceSchema } from '../utils/metaobjects-utils';
import { CollectionReference } from './syncTable/CollectionSchema';
import { FileReference } from './syncTable/FileSchema';
import { PageReference } from './syncTable/PageSchema';
import { ProductReference } from './syncTable/ProductSchemaRest';
import { ProductVariantReference } from './syncTable/ProductVariantSchema';

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
export async function updateCurrencyCodesInSchemaNew<
  SchemaT extends coda.Schema & coda.ObjectSchemaDefinition<string, string>
>(baseSchema: SchemaT, context: coda.ExecutionContext) {
  const schema: SchemaT = { ...baseSchema };
  const properties = schema.properties;

  for (const key in properties) {
    let prop = properties[key];

    if (typeof prop !== 'object') continue;

    // Recursively call the function for nested properties
    if ('properties' in prop) {
      prop = await updateCurrencyCodesInSchemaNew(prop, context);
    }

    // Call the function for nested arrays
    else if (isArrayProp(prop)) {
      prop = await updateCurrencyCodesInSchemaNew(prop.items as any, context);
    }

    // Update currency code for currency properties
    else if (isCurrencyProp(prop)) {
      shopCurrencyCode = shopCurrencyCode ?? (await Shop.activeCurrency({ context }));
      prop.currencyCode = shopCurrencyCode;
    }
  }

  return schema;
}

/*
async function wrapDynamicSchemaForCli(
  fn: coda.MetadataFormulaDef,
  context: coda.SyncExecutionContext,
  formulaContext: Record<string, any>
): Promise<coda.ArraySchema<coda.Schema>> {
  const getSchema = wrapGetSchema(wrapMetadataFunction(fn));
  const search = '';
  const serializedFormulaContext = JSON.stringify(formulaContext);

  const schema = await getSchema.execute([search, serializedFormulaContext], context);
  return normalizeSchema(schema);
}
*/
/**
 * Handles dynamic schema in CLI context.
 * It calls the provided `getSchemaFunction` if `context.sync.schema` is falsy.
 * It helps to overcome an issue where the dynamic schema is not present in `context.sync.schema` in CLI context.
 *
 * @param getSchemaFunction - The function to generate dynamic schema.
 * @param context - The sync execution context.
 * @param formulaContext - The formula metadata context.
 * @returns The schema
 */
/*
export async function resolveSchemaFromContext(
  getSchemaFunction: coda.MetadataFormulaDef,
  context: coda.SyncExecutionContext,
  formulaContext: Record<string, any>
): Promise<coda.ArraySchema<coda.Schema>> {
  return context.sync.schema ?? (await wrapDynamicSchemaForCli(getSchemaFunction, context, formulaContext));
}
*/

// #region Metafields in schema
export async function augmentSchemaWithMetafields<
  SchemaT extends coda.Schema & coda.ObjectSchemaDefinition<string, string>
>(baseSchema: SchemaT, ownerType: MetafieldOwnerType, context: coda.ExecutionContext) {
  const schema: SchemaT = { ...baseSchema };
  schema.featuredProperties = schema.featuredProperties ?? [];

  const metafieldDefinitions = await MetafieldHelper.getMetafieldDefinitionsForOwner({ context, ownerType });
  metafieldDefinitions.forEach((metafieldDefinition) => {
    const property = mapMetaFieldToSchemaProperty(metafieldDefinition.apiData);
    if (property) {
      const name = accents.remove(metafieldDefinition.apiData.name);
      const propName = `Meta${capitalizeFirstChar(name)}`;
      property.displayName = `${metafieldDefinition.apiData.name} [${metafieldDefinition.fullKey}]`;
      schema.properties[propName] = property;
      // always feature metafields properties so that the user know they are synced
      schema.featuredProperties.push(propName);
    }
  });

  return updateCurrencyCodesInSchemaNew(schema, context);
}

export function mapMetaFieldToSchemaProperty(
  fieldDefinition: ResultOf<typeof metafieldDefinitionFragment> | ResultOf<typeof metaobjectFieldDefinitionFragment>
): coda.Schema & coda.ObjectSchemaProperty {
  const type = fieldDefinition.type.name;
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
        description: `${baseProperty.description ? '\n' : ''}Valid units are ${Object.values(getUnitMap(type)).join(
          ', '
        )}.`,
      };
    case METAFIELD_TYPES.list_weight:
    case METAFIELD_TYPES.list_dimension:
    case METAFIELD_TYPES.list_volume:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: PROPS.STRING,
        description: `${baseProperty.description ? '\n' : ''}Valid units are ${Object.values(
          getUnitMap(type.replace('list.', ''))
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
        // maximum: maximumStr ? parseFloat(maximumStr) : undefined,
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
