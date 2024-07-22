// #region Imports
import * as coda from '@codahq/packs-sdk';

import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';
import { ShopClient } from '../../Clients/RestClients';
import {
  InvalidValueError,
  NotFoundError,
  RequiredParameterMissingVisibleError,
  UnsupportedValueError,
} from '../../Errors/Errors';
import * as PROPS from '../../coda/utils/coda-properties';
import { DEFAULT_CURRENCY_CODE } from '../../config';
import {
  LinkField,
  METAFIELD_LEGACY_TYPES,
  METAFIELD_LIST_PREFIX,
  METAFIELD_TYPES,
  MeasurementField,
  MetafieldLegacyType,
  MetafieldLinkType,
  MetafieldListLinkType,
  MetafieldListMeasurementType,
  MetafieldListRatingType,
  MetafieldMeasurementType,
  MetafieldRatingType,
  MetafieldReferenceType,
  MetafieldType,
  MoneyField,
  RatingField,
} from '../../constants/metafields-constants';
import { CUSTOM_FIELD_PREFIX_KEY } from '../../constants/pack-constants';
import {
  GraphQlResourceName,
  GraphQlResourceNames,
  RestResourcesPlural,
  RestResourcesSingular,
} from '../../constants/resourceNames-constants';
import { PREFIX_FAKE } from '../../constants/strings-constants';
import { metafieldDefinitionFragment } from '../../graphql/metafieldDefinitions-graphql';
import { ResultOf, graphQlGidToId, idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { BaseRow, FormatRowReferenceFn, MetafieldRow } from '../../schemas/CodaRows.types';
import { formatCollectionReference } from '../../schemas/syncTable/CollectionSchema';
import { formatFileReference } from '../../schemas/syncTable/FileSchema';
import { formatMetaobjectReference } from '../../schemas/syncTable/MetaObjectSchema';
import { MetafieldDefinitionReference } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { MetafieldSyncTableSchema, metafieldSyncTableHelperEditColumns } from '../../schemas/syncTable/MetafieldSchema';
import { formatPageReference } from '../../schemas/syncTable/PageSchema';
import { formatProductReference } from '../../schemas/syncTable/ProductSchema';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { GetSchemaArgs } from '../../sync/AbstractSyncedResources';
import { SupportedMetafieldSyncTable } from '../../sync/SupportedMetafieldSyncTable';
import { CurrencyCode, MetafieldOwnerType } from '../../types/admin.types';
import {
  deepCopy,
  isNullishOrEmpty,
  logAdmin,
  maybeParseJson,
  reverseMap,
  safeToFloat,
  safeToString,
  splitAndTrimValues,
} from '../../utils/helpers';
import { ModelWithDeletedFlag } from '../AbstractModel';
import { MetafieldDefinitionModel } from '../graphql/MetafieldDefinitionModel';
import {
  MetafieldGraphQlModel,
  MetafieldModelData as MetafieldGraphQlModelData,
  SupportedMetafieldOwnerName,
  SupportedMetafieldOwnerType,
} from '../graphql/MetafieldGraphQlModel';
import { BaseModelDataRest } from '../rest/AbstractModelRest';
import { MetafieldModel, MetafieldModelData, SupportedMetafieldOwnerResource } from '../rest/MetafieldModel';
import { extractValueAndUnitFromMeasurementString, measurementUnitToLabel } from './measurements-utils';
import { singularToPlural } from './restModel-utils';

// #endregion

// #region Shared function for Metafield Models
export interface MetafieldNormalizedData extends BaseModelDataRest, ModelWithDeletedFlag {
  id: number;
  gid: string;
  namespace: string;
  key: string;
  type: string;
  value: string;
  ownerId: number;
  ownerGid: string;
  /** Used to reference Product Variant parent Product */
  parentOwnerId?: number;
  /** Used to reference Product Variant parent Product */
  parentOwnerGid?: string;
  ownerType: SupportedMetafieldOwnerType;
  ownerResource: SupportedMetafieldOwnerResource;
  definitionId: number;
  definitionGid: string;
  createdAt: string;
  updatedAt: string;
}

export const METAFIELD_DELETED_SUFFIX = ' [deleted]';

export async function getMetafieldsDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
  let augmentedSchema = deepCopy(MetafieldSyncTableSchema);
  const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
  const supportedSyncTable = new SupportedMetafieldSyncTable(metafieldOwnerType);

  const { ownerReference, supportDefinition } = supportedSyncTable;

  if (ownerReference !== undefined) {
    augmentedSchema.properties['owner'] = {
      ...ownerReference,
      fromKey: 'owner',
      fixedId: 'owner',
      required: true,
      description: 'A relation to the owner of this metafield.',
    };
    // @ts-expect-error
    augmentedSchema.featuredProperties.push('owner');
  }

  if (supportDefinition) {
    augmentedSchema.properties['definition_id'] = {
      ...PROPS.ID_NUMBER,
      fixedId: 'definition_id',
      fromKey: 'definition_id',
      description: 'The ID of the metafield definition of the metafield, if it exists.',
    };

    augmentedSchema.properties['definition'] = {
      ...MetafieldDefinitionReference,
      fromKey: 'definition',
      fixedId: 'definition',
      description: 'The metafield definition of the metafield, if it exists.',
    };

    // @ts-expect-error: admin_url should always be the last featured property, but Shop doesn't have one
    augmentedSchema.featuredProperties.push('admin_url');
  } else {
    delete augmentedSchema.properties.admin_url;
    delete augmentedSchema.linkProperty;
  }

  return augmentedSchema;
}

export async function normalizeOwnerRowMetafields({
  context,
  ownerRow,
  ownerResource,
  metafieldDefinitions = [],
}: {
  ownerRow: BaseRow;
  ownerResource: SupportedMetafieldOwnerResource;
  metafieldDefinitions?: MetafieldDefinitionModel[];
  context: coda.ExecutionContext;
}) {
  const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(Object.keys(ownerRow));
  let currencyCode: CurrencyCode;

  const promises = prefixedMetafieldFromKeys.map(async (fromKey) => {
    const value = ownerRow[fromKey] as any;
    const realFromKey = removePrefixFromMetaFieldKey(fromKey);
    const metafieldDefinition = requireMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);

    const { key, namespace, type, validations, id: metafieldDefinitionGid } = metafieldDefinition.data;
    let formattedValue: string | null;

    if (type.name === METAFIELD_TYPES.money && currencyCode === undefined) {
      currencyCode = await ShopClient.createInstance(context).activeCurrency();
    }

    try {
      formattedValue = formatMetafieldValueForApi(
        value,
        type.name as MetafieldType | MetafieldLegacyType,
        validations,
        currencyCode
      );
    } catch (error) {
      throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${fromKey}.`);
    }

    const ownerType = restOwnerNameToOwnerType(ownerResource);
    const definitionGid =
      metafieldDefinitionGid && !metafieldDefinitionGid.startsWith(PREFIX_FAKE) ? metafieldDefinitionGid : undefined;

    return {
      id: undefined,
      gid: undefined,
      namespace,
      key,
      type: type.name,
      value: formattedValue,
      ownerId: ownerRow.id as number,
      ownerGid: idToGraphQlGid(ownerTypeToGraphQlOwnerName(ownerType), ownerRow.id),
      ownerType,
      ownerResource,
      definitionId: graphQlGidToId(definitionGid),
      definitionGid,
      createdAt: undefined,
      updatedAt: undefined,
      parentOwnerGid: undefined,
      parentOwnerId: undefined,
      isDeletedFlag: false,
    } as MetafieldNormalizedData;
  });

  return Promise.all(promises);
}

export function normalizeMetafieldRow(row: MetafieldRow): MetafieldNormalizedData {
  if (!row.label) throw new RequiredParameterMissingVisibleError('label');

  const isDeletedFlag = row.label.includes(METAFIELD_DELETED_SUFFIX);
  const fullkey = row.label.split(METAFIELD_DELETED_SUFFIX)[0];
  const { key, namespace } = splitMetaFieldFullKey(fullkey);
  const definitionId = row.definition_id || row.definition?.id;
  // Utilisation de rawValue ou de la valeur de l'helper column adaptée si elle a été utilisée
  let value: string | null = row.rawValue as string;
  for (let i = 0; i < metafieldSyncTableHelperEditColumns.length; i++) {
    const column = metafieldSyncTableHelperEditColumns[i];
    if (Object.keys(row).includes(column.key)) {
      if (row.type === column.type) {
        /**
         *? Si jamais on implémente une colonne pour les currencies,
         *? il faudra veiller a bien passer le currencyCode a {@link formatMetafieldValueForApi}
         */
        value = formatMetafieldValueForApi(row[column.key], row.type as MetafieldType | MetafieldLegacyType);
      } else {
        const goodColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === row.type);
        let errorMsg = `Metafield type mismatch. You tried to update using an helper column that doesn't match the metafield type.`;
        if (goodColumn) {
          errorMsg += ` The correct column for type '${row.type}' is: '${goodColumn.key}'.`;
        } else {
          errorMsg += ` You can only update this metafield by directly editing the 'Raw Value' column.`;
        }
        throw new coda.UserVisibleError(errorMsg);
      }
    }
  }

  return {
    id: isDeletedFlag ? null : row.id,
    gid: isDeletedFlag ? null : idToGraphQlGid(GraphQlResourceNames.Metafield, row.id),
    namespace,
    key,
    type: row.type,
    value: isNullishOrEmpty(value) ? null : value,
    ownerId: row.owner_id,
    ownerGid: idToGraphQlGid(ownerTypeToGraphQlOwnerName(row.owner_type as SupportedMetafieldOwnerType), row.owner_id),
    ownerType: row.owner_type as SupportedMetafieldOwnerType,
    ownerResource: ownerTypeToRestOwnerName(row.owner_type as SupportedMetafieldOwnerType),
    definitionId,
    definitionGid: idToGraphQlGid(GraphQlResourceNames.MetafieldDefinition, definitionId),
    createdAt: safeToString(row.created_at),
    updatedAt: safeToString(row.updated_at),
    parentOwnerGid: undefined,
    parentOwnerId: undefined,

    isDeletedFlag,
  };
}

export function getMetafieldAdminUrl(
  context: coda.ExecutionContext,
  owner: {
    hasMetafieldDefinition: boolean;
    singular: SupportedMetafieldOwnerResource;
    id: number;
    parentId?: number;
  }
): string | undefined {
  const { hasMetafieldDefinition, singular, id: owner_id, parentId: parentOwnerId } = owner;
  const plural = singularToPlural(singular);

  if (owner_id === undefined) return undefined;
  if (singular === RestResourcesSingular.Shop) return undefined;
  if (singular === RestResourcesSingular.ProductVariant && parentOwnerId === undefined) return undefined;

  let pathPart = `${plural}/${owner_id}`;
  if (singular === RestResourcesSingular.ProductVariant) {
    pathPart = `${RestResourcesPlural.Product}/${parentOwnerId}/${plural}/${owner_id}`;
  } else if (singular === RestResourcesSingular.Location) {
    pathPart = `settings/${plural}/${owner_id}`;
  }

  let admin_url = `${context.endpoint}/admin/${pathPart}/metafields`;
  if (!hasMetafieldDefinition) {
    admin_url += `/unstructured`;
  }
  return admin_url;
}

export async function deleteMetafield<T extends MetafieldModel | MetafieldGraphQlModel>(
  instance: T,
  baseDelete: () => Promise<void>
) {
  /** We dont always have the metafield ID but it could still be an existing Metafield, so we need to retrieve its Id */
  if (!instance.data.id) await instance.refreshData();

  /** If we have the metafield ID, we can delete it, else it probably means it has already been deleted */
  if (instance.data.id) {
    await baseDelete();
  } else {
    logAdmin(`Metafield already deleted.`);
  }

  // make sure to nullify metafield value
  instance.data.value = null;
  instance.data.isDeletedFlag = true;

  return instance.data as T extends MetafieldModel ? MetafieldModelData : MetafieldGraphQlModelData;
}

/**
 * Metafields should be deleted if their string value is empty of contains an empty JSON.stringified array
 */
export function shouldDeleteMetafield(string: string) {
  return isNullishOrEmpty(string) || string === '[]';
}

/**
 * Determine if a table cell value derived from a metafield ot metaobject field
 * value should be updated or not.
 * They are updatable if the value is not a reference to another resource
 * (except for mixed_reference and list_mixed_reference, wich use raw text
 * columns), or if is, it should not come from an action using `coda.withIdentity`
 * This is to prevent breaking existing relations when using `coda.withIdentity`.
 *
 * @param fieldType the type of the field definition
 * @param schemaWithIdentity wether the data will be consumed by an action wich result use a `coda.withIdentity` schema.
 * @returns `true` if the value should be updated
 */
export function shouldUpdateSyncTableMetafieldValue(fieldType: string, schemaWithIdentity = false): boolean {
  const isReference = fieldType.indexOf('_reference') !== -1;
  const shouldUpdateReference =
    !schemaWithIdentity ||
    (schemaWithIdentity &&
      [METAFIELD_TYPES.mixed_reference, METAFIELD_TYPES.list_mixed_reference].includes(fieldType as any));

  return !isReference || (isReference && shouldUpdateReference);
}

function requireMatchingMetafieldDefinition(
  fullKey: string,
  metafieldDefinitions: MetafieldDefinitionModel[]
): MetafieldDefinitionModel {
  const metafieldDefinition = metafieldDefinitions.find((f) => f && f.fullKey === fullKey);
  if (!metafieldDefinition) throw new NotFoundError('MetafieldDefinition');
  return metafieldDefinition;
}

// function normalizeMetafieldData(data: any) {
//   // Make sure the key property is never the 'full' key, i.e. `${namespace}.${key}`. -> Normalize it.
//   const fullkey = getMetaFieldFullKey(data);
//   const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullkey);

//   data.key = metaKey;
//   data.namespace = metaNamespace;
//   return data;
// }

// export function normalizeRestMetafieldToGraphQL(
//   metafield: Metafield,
//   metafieldOwnerType: MetafieldOwnerType,
//   metafieldDefinitions: Array<ResultOf<typeof metafieldDefinitionFragment>>
// ) {
//   const { apiData } = metafield;
//   const matchDefinition = findMatchingMetafieldDefinition(metafield.fullKey, metafieldDefinitions);
//   let obj: ResultOf<typeof metafieldFieldsFragmentWithDefinition>;
//   obj = {
//     __typename: GraphQlResourceName.Metafield,
//     id: idToGraphQlGid(GraphQlResourceName.Metafield, apiData.id),
//     key: apiData.key,
//     namespace: apiData.namespace,
//     type: apiData.type,
//     value: apiData.value as string,
//     createdAt: apiData.created_at,
//     updatedAt: apiData.updated_at,
//     ownerType: metafieldOwnerType,
//     definition: matchDefinition,
//   };
//   return obj;
// }
// #endregion

// #region Format For Api
/**
 * Pour les metafields de type list, quand on les édite dans l'interface de
 * Coda, ils seront temporairement converti comme une comma delimited string
 * value, du coup on reconverti en array si nécessaire
 */
export function maybeBackToArray<T extends any>(
  measurementValue: T | string,
  metafieldType: MetafieldType,
  targetType: 'string' | 'number' = 'string'
) {
  if (isListMetaFieldType(metafieldType) && typeof measurementValue === 'string') {
    const split = splitAndTrimValues(measurementValue).filter((s) => !isNullishOrEmpty(s));
    if (targetType === 'number') {
      return split.map(safeToFloat);
    } else {
      return split;
    }
  }

  return measurementValue as T;
}

function parseMarkdownLink(link: string) {
  /* Match full links and relative paths */
  const regex = /^\[([\w\s\d]*)\]\(((?:\/|https?:\/\/)[\w\d./?=#]+)\)$/;
  const match = link.match(regex);
  if (!match) {
    throw new Error('Link is not a valid markdown link');
  }
  const [full, text, url] = match;
  return { url, text };
}
function formatLinkField(value: string): LinkField {
  const parsed = parseMarkdownLink(value);
  return {
    url: parsed.url,
    text: parsed.text === parsed.url ? '' : parsed.text,
  };
}
function formatLinkFieldForApi(linkValue: string | string[]): string {
  return JSON.stringify(
    Array.isArray(linkValue) ? linkValue.map((v) => formatLinkField(v)) : formatLinkField(linkValue)
  );
}

/**
 * Format a Rating cell value for GraphQL Api
 */
function formatRatingField(
  value: number,
  validations: ResultOf<typeof metafieldDefinitionFragment>['validations']
): RatingField {
  if (!validations) {
    throw new Error('Validations are required to format a rating field');
  }
  return {
    scale_min: safeToFloat(validations.find((v) => v.name === 'scale_min').value),
    scale_max: safeToFloat(validations.find((v) => v.name === 'scale_max').value),
    value: value,
  };
}

/**
 * Format a Rating or list of rating cell values for GraphQL Api
 */
function formatRatingFieldsForApi(
  ratingValue: number | number[],
  validations: ResultOf<typeof metafieldDefinitionFragment>['validations'],
  metafieldType: MetafieldRatingType | MetafieldListRatingType
): string {
  const value = maybeBackToArray(ratingValue, metafieldType, 'number') as number | number[];
  return JSON.stringify(
    Array.isArray(value) ? value.map((v) => formatRatingField(v, validations)) : formatRatingField(value, validations)
  );
}

/**
 * Format a Money cell value
 */
function formatMoneyField(amount: number, currency_code: CurrencyCode): MoneyField {
  return { amount, currency_code: currency_code ?? DEFAULT_CURRENCY_CODE };
}

/**
 * Format a Money cell value for GraphQL Api
 */
function formatMoneyFieldsForApi(amount: number, currency_code: CurrencyCode): string {
  return JSON.stringify(formatMoneyField(amount, currency_code));
}

/**
 * Format a Measurement cell value
 * @param measurementValue the string entered by user in format "{value}{unit}" with eventual spaces between
 * @param metafieldType the type of metafield
 */
function formatMeasurementField(
  measurementValue: string,
  metafieldType: MetafieldMeasurementType | MetafieldListMeasurementType
): MeasurementField {
  const { value, label } = extractValueAndUnitFromMeasurementString(
    measurementValue,
    removeMetafieldTypeListPrefix(metafieldType) as MetafieldMeasurementType
  );
  return {
    value,
    unit: label,
  };
}

/**
 * Format a Measurement or list of Measurement cell value for GraphQL Api
 * @param measurementValue the string or list of strings entered by user in format "{value}{unit}" with eventual spaces between
 * @param metafieldType the type of metafield
 */
function formatMeasurementFieldsForApi(
  measurementValue: string | string[],
  metafieldType: MetafieldMeasurementType | MetafieldListMeasurementType
): string {
  const value = maybeBackToArray(measurementValue, metafieldType) as string | string[];
  return JSON.stringify(
    Array.isArray(value)
      ? value.map((v) => formatMeasurementField(v, metafieldType))
      : formatMeasurementField(value, metafieldType)
  );
}

/**
 * Format a Reference or list of Reference cell value for GraphQL Api
 * @param value
 * @param graphQlResourceName
 */
function formatReferenceFieldsForApi(
  value: { id: string } | { id: string }[],
  graphQlResourceName?: GraphQlResourceName
) {
  return Array.isArray(value)
    ? JSON.stringify(value.map((v) => formatReferenceFieldsForApi(v, graphQlResourceName)))
    : graphQlResourceName === undefined
    ? value?.id
    : idToGraphQlGid(graphQlResourceName, value?.id);
}

/**
 * This function is the same for a metaobject field and a metafield
 * @param value the Coda column cell value
 * @param type the type of field
 * @param validations possible validations from the field definition
 * @param currencyCode the current Shop currency code
 */
export function formatMetafieldValueForApi(
  value: any,
  type: MetafieldType | MetafieldLegacyType,
  validations?: ResultOf<typeof metafieldDefinitionFragment>['validations'],
  currencyCode?: CurrencyCode
): string | null {
  if (isNullishOrEmpty(value)) {
    return null;
  }

  switch (type) {
    case METAFIELD_TYPES.single_line_text_field:
    case METAFIELD_TYPES.multi_line_text_field:
    case METAFIELD_TYPES.url:
    case METAFIELD_TYPES.color:
    case METAFIELD_TYPES.date:
    case METAFIELD_TYPES.date_time:
    case METAFIELD_TYPES.json:
    case METAFIELD_LEGACY_TYPES.string:
    case METAFIELD_LEGACY_TYPES.json_string:
      return value;

    case METAFIELD_TYPES.boolean:
    case METAFIELD_LEGACY_TYPES.integer:
    case METAFIELD_TYPES.number_integer:
    case METAFIELD_TYPES.number_decimal:
    case METAFIELD_TYPES.list_single_line_text_field:
    case METAFIELD_TYPES.list_url:
    case METAFIELD_TYPES.list_color:
    case METAFIELD_TYPES.list_number_integer:
    case METAFIELD_TYPES.list_number_decimal:
    case METAFIELD_TYPES.list_date:
    case METAFIELD_TYPES.list_date_time:
      return JSON.stringify(value);

    // NOT SUPPORTED
    case METAFIELD_TYPES.rich_text_field:
      break;

    // LINKS
    case METAFIELD_TYPES.link:
      return formatLinkFieldForApi(value);
    case METAFIELD_TYPES.list_link:
      return formatLinkFieldForApi(splitAndTrimValues(value));

    // RATING
    case METAFIELD_TYPES.rating:
    case METAFIELD_TYPES.list_rating:
      return formatRatingFieldsForApi(value, validations, type);

    // MONEY
    case METAFIELD_TYPES.money:
      return formatMoneyFieldsForApi(value, currencyCode);

    // REFERENCE
    case METAFIELD_TYPES.page_reference:
    case METAFIELD_TYPES.list_page_reference:
      return formatReferenceFieldsForApi(value, GraphQlResourceNames.Page);

    case METAFIELD_TYPES.file_reference:
    case METAFIELD_TYPES.list_file_reference:
      return formatReferenceFieldsForApi(value);

    case METAFIELD_TYPES.metaobject_reference:
    case METAFIELD_TYPES.list_metaobject_reference:
      return formatReferenceFieldsForApi(value, GraphQlResourceNames.Metaobject);

    // We only support raw value for mixed references
    case METAFIELD_TYPES.mixed_reference:
      return value;
    case METAFIELD_TYPES.list_mixed_reference:
      // The value could have been converted to a real string by coda
      return JSON.stringify(Array.isArray(value) ? value : splitAndTrimValues(value));

    case METAFIELD_TYPES.collection_reference:
    case METAFIELD_TYPES.list_collection_reference:
      return formatReferenceFieldsForApi(value, GraphQlResourceNames.Collection);

    case METAFIELD_TYPES.product_reference:
    case METAFIELD_TYPES.list_product_reference:
      return formatReferenceFieldsForApi(value, GraphQlResourceNames.Product);

    case METAFIELD_TYPES.variant_reference:
    case METAFIELD_TYPES.list_variant_reference:
      return formatReferenceFieldsForApi(value, GraphQlResourceNames.ProductVariant);

    // MEASUREMENT
    case METAFIELD_TYPES.dimension:
    case METAFIELD_TYPES.volume:
    case METAFIELD_TYPES.weight:
    case METAFIELD_TYPES.list_dimension:
    case METAFIELD_TYPES.list_volume:
    case METAFIELD_TYPES.list_weight:
      return formatMeasurementFieldsForApi(value, type);

    default:
      break;
  }

  throw new UnsupportedValueError('MetafieldType', type);
}
// #endregion

// #region Format for Schema
export function removeMetafieldTypeListPrefix(metafieldType: MetafieldType) {
  return metafieldType.replace(METAFIELD_LIST_PREFIX, '') as MetafieldType;
}
export function prependMetafieldTypeListPrefix(metafieldType: MetafieldType) {
  return isListMetaFieldType(metafieldType)
    ? metafieldType
    : ((METAFIELD_LIST_PREFIX + metafieldType) as MetafieldType);
}
function isListMetaFieldType(metafieldType: MetafieldType): boolean {
  return metafieldType.startsWith(METAFIELD_LIST_PREFIX);
}

function formatReferenceFieldsForSchema(
  parsedValue: string | string[],
  formatReference: FormatRowReferenceFn<string | number, any>,
  useRawGid = false
) {
  return Array.isArray(parsedValue)
    ? parsedValue.map((id: string) => formatReferenceFieldsForSchema(id, formatReference, useRawGid))
    : formatReference(useRawGid ? parsedValue : graphQlGidToId(parsedValue));
}
function formatIntegerFieldsForSchema(parsedValue: string | string[]) {
  return Array.isArray(parsedValue) ? parsedValue.map((v) => formatIntegerFieldsForSchema(v)) : parseInt(parsedValue);
}
function formatDecimalFieldsForSchema(parsedValue: string | string[]) {
  return Array.isArray(parsedValue)
    ? parsedValue.map((v) => formatDecimalFieldsForSchema(v))
    : safeToFloat(parsedValue);
}

function formatLinkFieldsForSchema(parsedValue: LinkField | LinkField[]): string | string[] {
  return Array.isArray(parsedValue)
    ? parsedValue.map((v) => formatLinkFieldsForSchema(v) as string).join(', ')
    : isNullishOrEmpty(parsedValue.text)
    ? parsedValue.url
    : `[${parsedValue.text}](${parsedValue.url})`;
}
function formatMeasurementFieldsForSchema(
  parsedValue: { value: string; unit: string } | { value: string; unit: string }[]
) {
  return Array.isArray(parsedValue)
    ? parsedValue.map((v) => formatMeasurementFieldsForSchema(v))
    : `${parsedValue.value}${measurementUnitToLabel(parsedValue.unit)}`;
}
function formatRatingFieldsForSchema(parsedValue: { value: string } | { value: string }[]) {
  return Array.isArray(parsedValue)
    ? parsedValue.map((v) => formatRatingFieldsForSchema(v))
    : safeToFloat(parsedValue.value);
}
function formatMoneyFieldForSchema(parsedValue: { amount: string }) {
  return safeToFloat(parsedValue.amount);
}

// TODO: maybe we could return string arrays as a single string with delimiter, like '\n;;;\n' for easier editing inside Coda ?
/**
 * Format a metafield for a Resource schema that includes metafields
 */
export function formatMetaFieldValueForSchema({ value, type }: { value: string; type: string }) {
  const parsedValue = maybeParseJson(value);
  if (isNullishOrEmpty(parsedValue)) return null;

  switch (type) {
    case METAFIELD_TYPES.single_line_text_field:
    case METAFIELD_TYPES.multi_line_text_field:
    case METAFIELD_TYPES.url:
    case METAFIELD_TYPES.color:
    case METAFIELD_TYPES.date:
    case METAFIELD_TYPES.date_time:
    case METAFIELD_TYPES.boolean:
    case METAFIELD_LEGACY_TYPES.string:
    case METAFIELD_TYPES.list_single_line_text_field:
    case METAFIELD_TYPES.list_url:
    case METAFIELD_TYPES.list_color:
    case METAFIELD_TYPES.list_date:
    case METAFIELD_TYPES.list_date_time:
      return parsedValue;

    case METAFIELD_LEGACY_TYPES.integer:
    case METAFIELD_TYPES.number_integer:
    case METAFIELD_TYPES.list_number_integer:
      return formatIntegerFieldsForSchema(parsedValue);

    case METAFIELD_TYPES.number_decimal:
    case METAFIELD_TYPES.list_number_decimal:
      return formatDecimalFieldsForSchema(parsedValue);

    case METAFIELD_TYPES.rich_text_field:
      return convertSchemaToHtml(parsedValue);

    case METAFIELD_TYPES.json:
    case METAFIELD_LEGACY_TYPES.json_string:
      return JSON.stringify(parsedValue);

    case METAFIELD_TYPES.link:
    case METAFIELD_TYPES.list_link:
      return formatLinkFieldsForSchema(parsedValue);

    // RATING
    case METAFIELD_TYPES.rating:
    case METAFIELD_TYPES.list_rating:
      return formatRatingFieldsForSchema(parsedValue);

    // MONEY
    case METAFIELD_TYPES.money:
      return formatMoneyFieldForSchema(parsedValue);

    // REFERENCES
    case METAFIELD_TYPES.collection_reference:
    case METAFIELD_TYPES.list_collection_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatCollectionReference);

    // Files are the only resources that use GraphQL GID
    case METAFIELD_TYPES.file_reference:
    case METAFIELD_TYPES.list_file_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatFileReference, true);

    case METAFIELD_TYPES.metaobject_reference:
    case METAFIELD_TYPES.list_metaobject_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatMetaobjectReference);

    // We only support raw value for mixed references
    case METAFIELD_TYPES.mixed_reference:
    case METAFIELD_TYPES.list_mixed_reference:
      return parsedValue;

    case METAFIELD_TYPES.page_reference:
    case METAFIELD_TYPES.list_page_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatPageReference);

    case METAFIELD_TYPES.product_reference:
    case METAFIELD_TYPES.list_product_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatProductReference);

    case METAFIELD_TYPES.variant_reference:
    case METAFIELD_TYPES.list_variant_reference:
      return formatReferenceFieldsForSchema(parsedValue, formatProductVariantReference);

    // MEASUREMENT
    case METAFIELD_TYPES.dimension:
    case METAFIELD_TYPES.volume:
    case METAFIELD_TYPES.weight:
    case METAFIELD_TYPES.list_dimension:
    case METAFIELD_TYPES.list_volume:
    case METAFIELD_TYPES.list_weight:
      return formatMeasurementFieldsForSchema(parsedValue);

    default: {
      throw new UnsupportedValueError('MetafieldType', type);
    }
  }
}

export function formatMetafieldsForOwnerRow(metafields = []) {
  return metafields.reduce(
    (acc, metafield) => ({
      ...acc,
      [metafield.prefixedFullKey]: metafield.formatValueForOwnerRow(),
    }),
    {}
  );
}
// #endregion

// #region Metafield key utils
export function getMetaFieldFullKey(m: { namespace: string; key: string }): string {
  if (hasMetafieldFullKey(m)) return m.key as string;
  return `${m.namespace}.${m.key}`;
}

export const splitMetaFieldFullKey = (fullKey: string) => {
  const lastDotIndex = fullKey.lastIndexOf('.');
  if (lastDotIndex === -1) {
    throw new InvalidValueError('Metafield full key', fullKey);
  }
  return {
    key: fullKey.substring(lastDotIndex + 1),
    namespace: fullKey.substring(0, lastDotIndex),
  };
};

/**
 * This function checks if a given metafield key is the 'full' one or not.
 * When querying metafields via their keys, GraphQl returns the 'full' key, i.e. `${namespace}.${key}`.
 */
function hasMetafieldFullKey(metafield: { namespace: string; key: string }) {
  return metafield.key.indexOf(metafield.namespace) === 0;
}

/**
 * A naive way to check if any of the keys might be a metafield key
 */
function maybeHasMetaFieldKeys(keys: string[]) {
  return keys.some((key) => key.indexOf('.') !== -1);
}

/**
 * Prepend a custom prefix to the metafield key
 * This allows us to detect if a coda column key is a metafield column to handle updates
 */
export function preprendPrefixToMetaFieldKey(fullKey: string): string {
  return isPrefixedMetaFieldKey(fullKey) ? fullKey : CUSTOM_FIELD_PREFIX_KEY + fullKey;
}

/**
 * Remove our custom prefix from the metafield key
 */
export function removePrefixFromMetaFieldKey(fromKey: string): string {
  return fromKey.replace(CUSTOM_FIELD_PREFIX_KEY, '');
}

/**
 * Check if the given key is a prefixed metafield key.
 */
export function isPrefixedMetaFieldKey(fromKey: string): boolean {
  return fromKey.startsWith(CUSTOM_FIELD_PREFIX_KEY);
}

/**
 * Differentiate between the metafields columns and the standard columns from
 * the effective columns keys that we can get when coda does an update or
 * perform a sync table request.
 */
export function separatePrefixedMetafieldsKeysFromKeys(fromKeys: string[]) {
  const prefixedMetafieldFromKeys = fromKeys.filter((fromKey) => isPrefixedMetaFieldKey(fromKey));
  const standardFromKeys = fromKeys.filter((fromKey) => prefixedMetafieldFromKeys.indexOf(fromKey) === -1);

  return { prefixedMetafieldFromKeys, standardFromKeys };
}
// #endregion

// #region Converters
const ownerTypeToGraphQlOwnerNameMap: Partial<Record<SupportedMetafieldOwnerType, SupportedMetafieldOwnerName>> = {
  [MetafieldOwnerType.Article]: GraphQlResourceNames.Article,
  [MetafieldOwnerType.Blog]: GraphQlResourceNames.Blog,
  [MetafieldOwnerType.Collection]: GraphQlResourceNames.Collection,
  [MetafieldOwnerType.Customer]: GraphQlResourceNames.Customer,
  [MetafieldOwnerType.Draftorder]: GraphQlResourceNames.DraftOrder,
  [MetafieldOwnerType.Location]: GraphQlResourceNames.Location,
  [MetafieldOwnerType.Order]: GraphQlResourceNames.Order,
  [MetafieldOwnerType.Page]: GraphQlResourceNames.Page,
  [MetafieldOwnerType.Product]: GraphQlResourceNames.Product,
  [MetafieldOwnerType.Productvariant]: GraphQlResourceNames.ProductVariant,
  [MetafieldOwnerType.Shop]: GraphQlResourceNames.Shop,
} as const;

const ownerTypeToRestOwnerNameMap: Partial<Record<SupportedMetafieldOwnerType, SupportedMetafieldOwnerResource>> = {
  [MetafieldOwnerType.Article]: RestResourcesSingular.Article,
  [MetafieldOwnerType.Blog]: RestResourcesSingular.Blog,
  [MetafieldOwnerType.Collection]: RestResourcesSingular.Collection,
  [MetafieldOwnerType.Customer]: RestResourcesSingular.Customer,
  [MetafieldOwnerType.Draftorder]: RestResourcesSingular.DraftOrder,
  [MetafieldOwnerType.Location]: RestResourcesSingular.Location,
  [MetafieldOwnerType.Order]: RestResourcesSingular.Order,
  [MetafieldOwnerType.Page]: RestResourcesSingular.Page,
  [MetafieldOwnerType.Product]: RestResourcesSingular.Product,
  [MetafieldOwnerType.Productvariant]: RestResourcesSingular.ProductVariant,
  [MetafieldOwnerType.Shop]: RestResourcesSingular.Shop,
} as const;

const metafieldReferenceTypeToGraphQlOwnerNameMap: Record<MetafieldReferenceType, GraphQlResourceName> = {
  [METAFIELD_TYPES.collection_reference]: GraphQlResourceNames.Collection,
  [METAFIELD_TYPES.metaobject_reference]: GraphQlResourceNames.Metaobject,
  [METAFIELD_TYPES.mixed_reference]: GraphQlResourceNames.Metaobject,
  [METAFIELD_TYPES.page_reference]: GraphQlResourceNames.Page,
  [METAFIELD_TYPES.product_reference]: GraphQlResourceNames.Product,
  [METAFIELD_TYPES.variant_reference]: GraphQlResourceNames.ProductVariant,
};

/** Matches a GraphQl MetafieldOwnerType to the corresponding GraphQL resource name. */
export function ownerTypeToGraphQlOwnerName(ownerType: SupportedMetafieldOwnerType): SupportedMetafieldOwnerName {
  const map = ownerTypeToGraphQlOwnerNameMap;
  if (ownerType in map) return map[ownerType];
  throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
}

/** Matches a GraphQl MetafieldOwnerType to the corresponding Rest owner resource name. */
export function ownerTypeToRestOwnerName(ownerType: MetafieldOwnerType): SupportedMetafieldOwnerResource {
  const map = ownerTypeToRestOwnerNameMap;
  if (ownerType in map) return map[ownerType];
  throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
}

/** Matches a Rest owner resource name to the corresponding GraphQl MetafieldOwnerType. */
export function restOwnerNameToOwnerType(restOwnerName: SupportedMetafieldOwnerResource): SupportedMetafieldOwnerType {
  const map = reverseMap(ownerTypeToRestOwnerNameMap);
  if (restOwnerName in map) return map[restOwnerName];
  throw new UnsupportedValueError('OwnerResource', restOwnerName);
}

/** Matches a GraphQL resource name to the corresponding GraphQl MetafieldOwnerType. */
export function graphQlOwnerNameToOwnerType(
  graphQlOwnerName: SupportedMetafieldOwnerName
): SupportedMetafieldOwnerType {
  const map = reverseMap(ownerTypeToGraphQlOwnerNameMap);
  if (graphQlOwnerName in map) return map[graphQlOwnerName];
  throw new UnsupportedValueError('graphQlResourceName', graphQlOwnerName);
}

/** Matches a Metafield reference type to its corresponding GraphQL resource name. */
export function metafieldReferenceTypeToGraphQlOwnerName(type: MetafieldType): GraphQlResourceName {
  const map = metafieldReferenceTypeToGraphQlOwnerNameMap;
  if (type in map) return map[type];
  throw new UnsupportedValueError('MetafieldTypeValue', type);
}
// #endregion
