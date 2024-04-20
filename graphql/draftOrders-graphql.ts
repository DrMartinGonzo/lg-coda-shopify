// #region Helpers
function buildDraftOrdersSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];

  if (filters.ids && filters.ids.length) searchItems.push('(' + filters.ids.map((id) => `id:${id}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}
// #endregion

// #region Queries
// export const QueryDraftOrdersMetafieldsAdmin = /* GraphQL */ `
//   ${MetafieldFieldsFragment}

//   query getDraftOrdersMetafields(
//     $limit: Int!
//     $cursor: String
//     $metafieldKeys: [String!]
//     $countMetafields: Int
//     $searchQuery: String
//   ) {
//     draftOrders(first: $limit, after: $cursor, query: $searchQuery, sortKey: ID) {
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
