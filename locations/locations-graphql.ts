import '../types/admin.generated.d.ts';

import { MetafieldFieldsFragment } from '../metafields/metafields-graphql';

// #region Helpers
export function buildLocationsSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];

  if (filters.ids && filters.ids.length) searchItems.push('(' + filters.ids.map((id) => `id:${id}`).join(' OR ') + ')');

  return searchItems.join(' AND ');
}
// #endregion

// #region Queries
export const QueryLocationsMetafieldsAdmin = /* GraphQL */ `
  ${MetafieldFieldsFragment}

  query getLocationsMetafields(
    $maxEntriesPerRun: Int!
    $cursor: String
    $metafieldKeys: [String!]
    $countMetafields: Int
    $searchQuery: String
  ) {
    locations(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID) {
      nodes {
        id

        metafields(keys: $metafieldKeys, first: $countMetafields) {
          nodes {
            ...MetafieldFields
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
// #endregion
