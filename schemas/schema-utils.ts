import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import { ResultOf } from '../utils/tada-utils';

import { UnsupportedValueError } from '../Errors';
import { MetafieldDefinition } from '../Resources/GraphQl/MetafieldDefinition';
import { METAFIELD_LEGACY_TYPES, METAFIELD_TYPES } from '../Resources/Mixed/Metafield.types';
import { Shop } from '../Resources/Rest/Shop';
import { DEFAULT_CURRENCY_CODE } from '../config';
import { metafieldDefinitionFragment } from '../graphql/metafieldDefinitions-graphql';
import { metaobjectFieldDefinitionFragment } from '../graphql/metaobjectDefinition-graphql';
import {
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
} from '../resourcesOld/metafields/utils/metafields-utils-keys';
import { MetafieldDefinition as MetafieldDefinitionType, MetafieldOwnerType } from '../types/admin.types';
import { capitalizeFirstChar, getUnitMap } from '../utils/helpers';
import { CollectionReference } from './syncTable/CollectionSchema';
import { FileReference } from './syncTable/FileSchema';
import { getMetaobjectReferenceSchema } from '../utils/metaobjects-utils';
import { PageReference } from './syncTable/PageSchema';
import { ProductReference } from './syncTable/ProductSchemaRest';
import { ProductVariantReference } from './syncTable/ProductVariantSchema';

export function extractFormulaContextFromParamsWIP(params: coda.ParamsList) {
  const but = params.map((param, index) => {
    return [param.name, params[index]];
  });
  return Object.fromEntries(but);
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
export async function augmentSchemaWithMetafields<SchemaT extends coda.ObjectSchemaDefinition<string, string>>(
  baseSchema: SchemaT,
  ownerType: MetafieldOwnerType,
  context: coda.ExecutionContext
) {
  const schema: SchemaT = { ...baseSchema };
  schema.featuredProperties = schema.featuredProperties ?? [];

  const metafieldDefinitions = await MetafieldDefinition.allForOwner({
    context,
    ownerType,
    // TODO: maybe adjust cache ?
    // options: { cacheTtlSecs: CACHE_DEFAULT },
  });

  const hasMoneyFields = metafieldDefinitions.some((metafieldDefinition) => {
    return metafieldDefinition.apiData.type.name === METAFIELD_TYPES.money;
  });

  let shopCurrencyCode = DEFAULT_CURRENCY_CODE;
  if (hasMoneyFields) {
    shopCurrencyCode = await Shop.activeCurrency({ context });
  }

  metafieldDefinitions.forEach((metafieldDefinition) => {
    const property = mapMetaFieldToSchemaProperty(metafieldDefinition.apiData);
    if (property) {
      // TODO: write a generic function for setting Shop currency code in schema
      if ('codaType' in property && property.codaType === coda.ValueHintType.Currency) {
        property['currencyCode'] = shopCurrencyCode;
      }

      const name = accents.remove(metafieldDefinition.apiData.name);
      const propName = `Meta${capitalizeFirstChar(name)}`;
      property.displayName = `${metafieldDefinition.apiData.name} [${metafieldDefinition.fullKey}]`;
      schema.properties[propName] = property;
      // always feature metafields properties so that the user know they are synced
      schema.featuredProperties.push(propName);
    }
  });

  return schema;
}

export function mapMetaFieldToSchemaProperty(
  fieldDefinition: ResultOf<typeof metafieldDefinitionFragment> | ResultOf<typeof metaobjectFieldDefinitionFragment>
): coda.Schema & coda.ObjectSchemaProperty {
  const type = fieldDefinition.type.name;
  let description = fieldDefinition.description;
  const isMetaobjectFieldDefinition = !fieldDefinition.hasOwnProperty('namespace');

  let schemaKey = fieldDefinition.key;

  /**
   * Add full key to description for metafields, not metaobject fields
   * We prefix fromKey to be able to determine later wich columns are metafield values
   */
  if (!isMetaobjectFieldDefinition) {
    const fullKey = getMetaFieldFullKey(fieldDefinition as MetafieldDefinitionType);
    description += (description ? '\n' : '') + `field key: [${fullKey}]`;

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
        type: coda.ValueType.String,
        mutable: true,
      };
    case METAFIELD_TYPES.list_color:
    case METAFIELD_TYPES.list_single_line_text_field:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.String },
      };

    // Rich text
    case METAFIELD_TYPES.rich_text_field:
      return {
        ...baseProperty,
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.Html,
      };

    // MEASUREMENT
    case METAFIELD_TYPES.weight:
    case METAFIELD_TYPES.dimension:
    case METAFIELD_TYPES.volume:
      return {
        ...baseProperty,
        type: coda.ValueType.String,
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
        items: { type: coda.ValueType.String },
        description: `${baseProperty.description ? '\n' : ''}Valid units are ${Object.values(
          getUnitMap(type.replace('list.', ''))
        ).join(', ')}.`,
      };

    // URL
    case METAFIELD_TYPES.url:
      return {
        ...baseProperty,
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.Url,
        mutable: true,
      };
    case METAFIELD_TYPES.list_url:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.String, codaType: coda.ValueHintType.Url },
      };

    // RATING
    case METAFIELD_TYPES.rating:
      return {
        ...baseProperty,
        type: coda.ValueType.Number,
        // codaType: coda.ValueHintType.Scale,
        // maximum: maximumStr ? parseFloat(maximumStr) : undefined,
        mutable: true,
      };
    case METAFIELD_TYPES.list_rating:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.Number },
      };

    // NUMBER
    case METAFIELD_TYPES.number_integer:
      return {
        ...baseProperty,
        type: coda.ValueType.Number,
        precision: 0,
        mutable: true,
      };
    case METAFIELD_TYPES.list_number_integer:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.Number, precision: 0 },
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
        type: coda.ValueType.Number,
        codaType: coda.ValueHintType.Currency,
        mutable: true,
      };

    // TRUE_FALSE
    case METAFIELD_TYPES.boolean:
      return {
        ...baseProperty,
        type: coda.ValueType.Boolean,
        mutable: true,
      };

    // DATE_TIME
    case METAFIELD_TYPES.date:
      return {
        ...baseProperty,
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.Date,
        mutable: true,
      };
    case METAFIELD_TYPES.list_date:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.String, codaType: coda.ValueHintType.Date },
      };

    case METAFIELD_TYPES.date_time:
      return {
        ...baseProperty,
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.DateTime,
        mutable: true,
      };
    case METAFIELD_TYPES.list_date_time:
      return {
        ...baseProperty,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
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
        type: coda.ValueType.String,
        mutable: true,
      };
    case METAFIELD_TYPES.list_mixed_reference:
      return {
        ...baseProperty,
        description: '⚠️ We only support raw values for mixed references.\n' + baseProperty.description,
        type: coda.ValueType.Array,
        items: { type: coda.ValueType.String },
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