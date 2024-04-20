// #region Helpers
function buildOrdersSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];

  if (filters.ids && filters.ids.length) searchItems.push('(' + filters.ids.map((id) => `id:${id}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}
// #endregion

// #region Queries
// export const QueryOrdersMetafieldsAdmin = /* GraphQL */ `
//   ${MetafieldFieldsFragment}

//   query getOrdersMetafields(
//     $limit: Int!
//     $cursor: String
//     $metafieldKeys: [String!]
//     $countMetafields: Int
//     $searchQuery: String
//   ) {
//     orders(first: $limit, after: $cursor, query: $searchQuery, sortKey: ID) {
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
