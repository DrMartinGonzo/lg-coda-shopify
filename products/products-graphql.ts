import { graphQlGidToId, pageInfoPart, userErrorsPart } from '../helpers-graphql';
import { metafieldFieldsFragment } from '../metafields/metafields-graphql';

const MAX_OPTIONS_PER_PRODUCT = 3;

/**====================================================================================================================
 *    Fragments and helpers
 *===================================================================================================================== */
const metafieldAdminNodes = `
  metafields(keys: $metafieldKeys, first: $countMetafields) {
    nodes { ...metafieldFields }
  }`;

const metafieldStorefrontNodes = `
  metafields(identifiers: $metafieldsIdentifiers) {
    ...metafieldFields
  }`;

const makeProductFieldsFragmentAdmin = (optionalNestedFields: string[]) => {
  const hasMetafields = optionalNestedFields.includes('metafields');

  return `#graphql
    fragment productFields on Product {
      id
      handle
      createdAt
      title
      productType
      publishedAt
      status
      tags
      templateSuffix
      updatedAt
      vendor
      isGiftCard
      descriptionHtml
      onlineStoreUrl

      ${optionalNestedFields.includes('options') ? `options(first: ${MAX_OPTIONS_PER_PRODUCT}) { name }` : ''}
      ${optionalNestedFields.includes('featuredImage') ? 'featuredImage { url }' : ''}

      # availableForSale
      # publishedOnPublication(publicationId: "gid://shopify/Publication/42911268979")
      # seo {
      #   description
      #   title
      # }
      # trackingParameters
      # media(first: 10) {
      #   nodes {
      #     mediaContentType
      #   }
      # }

      ${hasMetafields ? metafieldAdminNodes : ''}
    }

    ${hasMetafields ? metafieldFieldsFragment : ''}
  `;
};

const makeProductFieldsFragmentStorefront = (includeMetafields: boolean = false) => `
  fragment productFields on Product {
    availableForSale
    createdAt
    handle
    id
    descriptionHtml
    productType
    publishedAt
    seo {
      description
      title
    }
    tags
    title
    featuredImage {
      url
    }
    #trackingParameters
    updatedAt
    vendor
    isGiftCard
    media(first: 10) {
      nodes {
        mediaContentType
      }
    }
    ${includeMetafields ? `metafields(identifiers: $metafieldsIdentifiers) { ...metafieldFields }` : ''}
    options(first: ${MAX_OPTIONS_PER_PRODUCT}) {
      name
      #values
    }
  }

  ${includeMetafields ? metafieldFieldsFragment : ''}
`;

function buildSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];
  if (filters.search) searchItems.push(filters.search);

  // date range filters
  if (filters.created_at_min) searchItems.push(`created_at:>='${filters.created_at_min.toISOString()}'`);
  if (filters.created_at_max) searchItems.push(`created_at:<='${filters.created_at_max.toISOString()}'`);
  if (filters.updated_at_min) searchItems.push(`updated_at:>='${filters.updated_at_min.toISOString()}'`);
  if (filters.updated_at_max) searchItems.push(`updated_at:<='${filters.updated_at_max.toISOString()}'`);

  if (filters.gift_card !== undefined) searchItems.push(`gift_card:'${filters.gift_card === true ? 'true' : 'false'}'`);
  if (filters.published_status) searchItems.push(`published_status:${filters.published_status}`);
  if (filters.title) searchItems.push(`title:'${filters.title}'`);
  if (filters.status && filters.status.length)
    searchItems.push('(' + filters.status.map((status) => `status:${status}`).join(' OR ') + ')');

  if (filters.vendors && filters.vendors.length)
    searchItems.push('(' + filters.vendors.map((vendor) => `vendor:'${vendor}'`).join(' OR ') + ')');

  if (filters.product_types && filters.product_types.length)
    searchItems.push(
      '(' + filters.product_types.map((product_type) => `product_type:'${product_type}'`).join(' OR ') + ')'
    );

  if (filters.ids && filters.ids.length)
    searchItems.push('(' + filters.ids.map((id) => `id:${graphQlGidToId(id)}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}

/**====================================================================================================================
 *    Queries
 *===================================================================================================================== */
// Storefront query to list max 50 available product types
export const queryAvailableProductTypes = `#graphql
  query QueryAvailableProductTypes{
    productTypes(first: 50) {
      edges {
        node
      }
    }
  }
`;

export const makeQueryProductsAdmin = (optionalNestedFields: string[], filters: { [key: string]: any }) => {
  // Remove any undefined filters
  Object.keys(filters).forEach((key) => {
    if (filters[key] === undefined) delete filters[key];
  });
  const searchQuery = buildSearchQuery(filters);
  console.log('searchQuery', searchQuery);

  const hasMetafields = optionalNestedFields.includes('metafields');
  const declaredVariables = ['$maxEntriesPerRun: Int!', '$cursor: String'];
  if (hasMetafields) {
    declaredVariables.push('$metafieldKeys: [String!]');
    declaredVariables.push('$countMetafields: Int!');
  }

  return `#graphql
  query queryProductsWithMetafields(${declaredVariables.join(', ')}) {
    products(first: $maxEntriesPerRun, after: $cursor, query: "${searchQuery}") {
      nodes {
        ...productFields
      }
      ${pageInfoPart}
    }
  }

  ${makeProductFieldsFragmentAdmin(optionalNestedFields)}
`;
};

/**====================================================================================================================
 *    Mutations
 *===================================================================================================================== */
export function makeMutationUpdateProduct(optionalNestedFields: string[]) {
  const hasMetafields = optionalNestedFields.includes('metafields');
  const declaredVariables = ['$productInput: ProductInput!', '$metafieldsSetsInput: [MetafieldsSetInput!]!'];
  if (hasMetafields) {
    declaredVariables.push('$metafieldKeys: [String!]');
    declaredVariables.push('$countMetafields: Int!');
  }

  return `#graphql
    mutation UpdateProduct(${declaredVariables.join(', ')}) {
      metafieldsSet(metafields: $metafieldsSetsInput) {
        metafields {
          key
          namespace
          value
        }
        ${userErrorsPart}
      }
      productUpdate(input: $productInput) {
        product {
          # id
          ...productFields
        }
        ${userErrorsPart}
      }
    }

    ${makeProductFieldsFragmentAdmin(optionalNestedFields)}
  `;
}
