// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../../../utils/graphql';

import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';
import { graphQlGidToId, idToGraphQlGid } from '../../../helpers-graphql';
import { MetafieldRow } from '../../../schemas/CodaRows.types';
import { formatArticleReference } from '../../../schemas/syncTable/ArticleSchema';
import { formatBlogReference } from '../../../schemas/syncTable/BlogSchema';
import { formatCollectionReference } from '../../../schemas/syncTable/CollectionSchema';
import { formatCustomerReference } from '../../../schemas/syncTable/CustomerSchema';
import { formatFileReference } from '../../../schemas/syncTable/FileSchema';
import { formatLocationReference } from '../../../schemas/syncTable/LocationSchema';
import { formatMetaobjectReference } from '../../../schemas/syncTable/MetaObjectSchema';
import { formatMetafieldDefinitionReference } from '../../../schemas/syncTable/MetafieldDefinitionSchema';
import { metafieldSyncTableHelperEditColumns } from '../../../schemas/syncTable/MetafieldSchema';
import { formatOrderReference } from '../../../schemas/syncTable/OrderSchema';
import { formatPageReference } from '../../../schemas/syncTable/PageSchema';
import { formatProductReference } from '../../../schemas/syncTable/ProductSchemaRest';
import { formatProductVariantReference } from '../../../schemas/syncTable/ProductVariantSchema';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { maybeParseJson, unitToShortName } from '../../../utils/helpers';
import { ResourceWithMetafields } from '../../Resource.types';
import {
  GraphQlResourceName,
  RestResourcePlural,
  RestResourceSingular,
  RestResources,
} from '../../ShopifyResource.types';
import { findMatchingMetafieldDefinition } from '../../metafieldDefinitions/metafieldDefinitions-functions';
import { metafieldDefinitionFragment } from '../../metafieldDefinitions/metafieldDefinitions-graphql';
import { METAFIELD_LEGACY_TYPES, METAFIELD_TYPES, MetafieldOwnerNode } from '../Metafield.types';
import { metafieldFieldsFragment, metafieldFieldsFragmentWithDefinition } from '../metafields-graphql';
import { getMetaFieldFullKey, splitMetaFieldFullKey } from './metafields-utils-keys';
import { Metafield } from '../../../Fetchers/NEW/Resources/Metafield';

// #endregion

function getMetafieldsAdminUrl(
  context: coda.ExecutionContext,
  restResource: ResourceWithMetafields<any, any>,
  hasMetafieldDefinition: boolean,
  ownerId: number,
  parentOwnerId?: number
) {
  let admin_url: string;
  const { singular, plural } = restResource.rest;

  switch (singular) {
    case RestResourceSingular.Article:
    case RestResourceSingular.Blog:
    case RestResourceSingular.Collection:
    case RestResourceSingular.Customer:
    case RestResourceSingular.Order:
    case RestResourceSingular.Page:
    case RestResourceSingular.Product:
      admin_url = `${context.endpoint}/admin/${plural}/${ownerId}/metafields`;
      break;

    case RestResourceSingular.Location:
      admin_url = `${context.endpoint}/admin/settings/${plural}/${ownerId}/metafields`;
      break;

    case RestResourceSingular.ProductVariant:
      if (parentOwnerId) {
        admin_url = `${context.endpoint}/admin/${RestResourcePlural.Product}/${parentOwnerId}/${plural}/${ownerId}/metafields`;
      }
      break;

    default:
      break;
  }
  if (admin_url && !hasMetafieldDefinition) {
    admin_url += `/unstructured`;
  }
  return admin_url;
}

export function normalizeRestMetafieldToGraphQL(
  metafield: Metafield,
  metafieldOwnerType: MetafieldOwnerType,
  metafieldDefinitions: Array<ResultOf<typeof metafieldDefinitionFragment>>
) {
  const { apiData } = metafield;
  const matchDefinition = findMatchingMetafieldDefinition(metafield.fullKey, metafieldDefinitions);
  let obj: ResultOf<typeof metafieldFieldsFragmentWithDefinition>;
  obj = {
    __typename: GraphQlResourceName.Metafield,
    id: idToGraphQlGid(GraphQlResourceName.Metafield, apiData.id),
    key: apiData.key,
    namespace: apiData.namespace,
    type: apiData.type,
    value: apiData.value as string,
    createdAt: apiData.created_at,
    updatedAt: apiData.updated_at,
    ownerType: metafieldOwnerType,
    definition: matchDefinition,
  };

  return obj;
}

/**
 * Format a metafield row for Metafield Sync Table Schema. A Rest metafield must
 * be normalized first using {@link normalizeRestMetafieldToGraphQL}
 */
export function formatMetafieldToRow(
  metafieldNode: ResultOf<typeof metafieldFieldsFragmentWithDefinition>,
  ownerResource: ResourceWithMetafields<any, any>,
  context: coda.ExecutionContext,
  ownerNode?: Partial<MetafieldOwnerNode>,
  includeHelperColumns: boolean = true
): MetafieldRow {
  const fullKey = getMetaFieldFullKey(metafieldNode);
  const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
  const ownerId = graphQlGidToId(ownerNode.id);
  const parentOwnerId = 'parentOwner' in ownerNode ? graphQlGidToId(ownerNode.parentOwner.id) : undefined;
  const hasMetafieldDefinition = !!metafieldNode.definition;
  let obj: MetafieldRow = {
    admin_graphql_api_id: metafieldNode.id,
    id: graphQlGidToId(metafieldNode.id),
    key: metaKey,
    namespace: metaNamespace,
    label: fullKey,
    owner_id: ownerId,
    owner_type: ownerResource.metafields.ownerType,
    owner: formatMetafieldOwnerRelation(ownerResource.graphQl.name, ownerId),
    rawValue: metafieldNode.value,
    type: metafieldNode.type,
    created_at: metafieldNode.createdAt,
    updated_at: metafieldNode.updatedAt,
  };
  if (metafieldNode.definition?.id) {
    const definitionId = graphQlGidToId(metafieldNode.definition.id);
    obj.definition_id = definitionId;
    obj.definition = formatMetafieldDefinitionReference(definitionId);
  }
  /**
   * We don't set it at once because parentOwnerId can be necessary but
   * undefined when formatting from a two way sync update (ex: ProductVariants).
   * Since this value is static, we return nothing to prevent erasing the
   * previous value. We could also retrieve the owner ID value directly in the
   * graphQl mutation result but doing it this way reduce the GraphQL query costs.
   */
  const maybeAdminUrl = getMetafieldsAdminUrl(context, ownerResource, hasMetafieldDefinition, ownerId, parentOwnerId);
  if (maybeAdminUrl) {
    obj.admin_url = maybeAdminUrl;
  }

  if (includeHelperColumns) {
    const helperColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === metafieldNode.type);
    if (helperColumn) {
      obj[helperColumn.key] = formatMetaFieldValueForSchema(metafieldNode);
    }
  }
  return obj;
}

function formatMetafieldOwnerRelation(ownerGraphQlName: GraphQlResourceName, ownerId: number) {
  switch (ownerGraphQlName) {
    case GraphQlResourceName.OnlineStoreArticle:
      return formatArticleReference(ownerId);
    case GraphQlResourceName.OnlineStoreBlog:
      return formatBlogReference(ownerId);
    case GraphQlResourceName.Collection:
      return formatCollectionReference(ownerId);
    case GraphQlResourceName.Customer:
      return formatCustomerReference(ownerId);
    case GraphQlResourceName.Location:
      return formatLocationReference(ownerId);
    case GraphQlResourceName.Order:
      return formatOrderReference(ownerId);
    case GraphQlResourceName.OnlineStorePage:
      return formatPageReference(ownerId);
    case GraphQlResourceName.Product:
      return formatProductReference(ownerId);
    case GraphQlResourceName.ProductVariant:
      return formatProductVariantReference(ownerId);
  }
  throw new Error(`Unsupported owner type: ${ownerGraphQlName}`);
}

// TODO: maybe we could return string arrays as a single string with delimiter, like '\n;;;\n' for easier editing inside Coda ?
/**
 * Format a metafield for a Resource schema that includes metafields
 */
export function formatMetaFieldValueForSchema(
  metafield: ResultOf<typeof metafieldFieldsFragment> | RestResources['Metafield'] | { value: string; type: string }
) {
  const parsedValue = maybeParseJson(metafield?.value);
  if (typeof parsedValue === 'undefined' || parsedValue === null || parsedValue === '') return;

  switch (metafield.type) {
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
      const typeNotFoundError = `The 'metafield.type' you passed in is not supported. Your type: "${metafield.type}".`;
      throw new Error(typeNotFoundError);
    }
  }
}
