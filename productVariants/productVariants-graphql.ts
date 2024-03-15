import { MetafieldFieldsFragment } from '../metafields/metafields-graphql';

// #region Helpers
export function buildProductVariantsSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];

  if (filters.product_ids && filters.product_ids.length)
    searchItems.push(`(product_ids:${filters.product_ids.join(',')})`);

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments

// #endregion

// #region Queries
// export const QueryProductVariantsMetafieldsAdmin = /* GraphQL */ `
//   ${MetafieldFieldsFragment}

//   query getProductVariantsMetafields(
//     $maxEntriesPerRun: Int!
//     $cursor: String
//     $metafieldKeys: [String!]
//     $countMetafields: Int
//     $searchQuery: String
//   ) {
//     productVariants(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID) {
//       nodes {
//         id

//         metafields(keys: $metafieldKeys, first: $countMetafields) {
//           nodes {
//             ...MetafieldFields
//           }
//         }
//       }
//       pageInfo {
//         hasNextPage
//         endCursor
//       }
//     }
//   }
// `;
// #endregion
