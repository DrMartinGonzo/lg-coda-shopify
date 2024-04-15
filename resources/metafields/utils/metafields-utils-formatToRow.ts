// #region Imports
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';
import { UnsupportedValueError } from '../../../Errors';
import { graphQlGidToId } from '../../../helpers-graphql';
import { formatCollectionReference } from '../../../schemas/syncTable/CollectionSchema';
import { formatFileReference } from '../../../schemas/syncTable/FileSchema';
import { formatMetaobjectReference } from '../../../schemas/syncTable/MetaObjectSchema';
import { formatPageReference } from '../../../schemas/syncTable/PageSchema';
import { formatProductReference } from '../../../schemas/syncTable/ProductSchemaRest';
import { formatProductVariantReference } from '../../../schemas/syncTable/ProductVariantSchema';
import { maybeParseJson, unitToShortName } from '../../../utils/helpers';
import { METAFIELD_LEGACY_TYPES, METAFIELD_TYPES } from '../Metafield.types';

// #endregion

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

// TODO: maybe we could return string arrays as a single string with delimiter, like '\n;;;\n' for easier editing inside Coda ?
/**
 * Format a metafield for a Resource schema that includes metafields
 */
export function formatMetaFieldValueForSchema({ value, type }: { value: string; type: string }) {
  const parsedValue = maybeParseJson(value);
  if (typeof parsedValue === 'undefined' || parsedValue === null || parsedValue === '') return;

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

    case METAFIELD_TYPES.number_integer:
    case METAFIELD_LEGACY_TYPES.integer:
      return parseInt(parsedValue);

    case METAFIELD_TYPES.number_decimal:
      return parseFloat(parsedValue);

    case METAFIELD_TYPES.list_number_integer:
      return parsedValue.map((v) => parseInt(v));

    case METAFIELD_TYPES.list_number_decimal:
      return parsedValue.map((v) => parseFloat(v));

    case METAFIELD_TYPES.rich_text_field:
      return convertSchemaToHtml(parsedValue);

    case METAFIELD_TYPES.json:
    case METAFIELD_LEGACY_TYPES.json_string:
      return JSON.stringify(parsedValue);

    // RATING
    case METAFIELD_TYPES.rating:
      return parsedValue.value;
    case METAFIELD_TYPES.list_rating:
      return parsedValue.map((v) => v.value);

    // MONEY
    case METAFIELD_TYPES.money:
      return parseFloat(parsedValue.amount);

    // REFERENCES
    case METAFIELD_TYPES.collection_reference:
      return formatCollectionReference(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_collection_reference:
      return parsedValue.map((v) => formatCollectionReference(graphQlGidToId(v)));

    case METAFIELD_TYPES.file_reference:
      return formatFileReference(parsedValue);
    case METAFIELD_TYPES.list_file_reference:
      return parsedValue.map(formatFileReference);

    case METAFIELD_TYPES.metaobject_reference:
      return formatMetaobjectReference(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_metaobject_reference:
      return parsedValue.map((v) => formatMetaobjectReference(graphQlGidToId(v)));

    // We only support raw value for mixed references
    case METAFIELD_TYPES.mixed_reference:
    case METAFIELD_TYPES.list_mixed_reference:
      return parsedValue;

    case METAFIELD_TYPES.page_reference:
      return formatPageReference(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_page_reference:
      return parsedValue.map((v) => formatPageReference(graphQlGidToId(v)));

    case METAFIELD_TYPES.product_reference:
      return formatProductReference(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_product_reference:
      return parsedValue.map((v) => formatProductReference(graphQlGidToId(v)));

    case METAFIELD_TYPES.variant_reference:
      return formatProductVariantReference(graphQlGidToId(parsedValue));
    case METAFIELD_TYPES.list_variant_reference:
      return parsedValue.map((v) => formatProductVariantReference(graphQlGidToId(v)));

    // MEASUREMENT
    case METAFIELD_TYPES.weight:
    case METAFIELD_TYPES.dimension:
    case METAFIELD_TYPES.volume:
      return `${parsedValue.value}${unitToShortName(parsedValue.unit)}`;
    case METAFIELD_TYPES.list_weight:
    case METAFIELD_TYPES.list_dimension:
    case METAFIELD_TYPES.list_volume:
      return parsedValue.map((v) => `${v.value}${unitToShortName(v.unit)}`);

    default: {
      throw new UnsupportedValueError('MetafieldType', type);
    }
  }
}
