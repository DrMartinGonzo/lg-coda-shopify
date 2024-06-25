// #region Imports
import { pageInfoFragment } from './sharedFragments-graphql';
import { graphql } from './utils/graphql-utils';

// #endregion

// #region Fragments
export const marketFieldsFragment = graphql(`
  fragment MarketFields on Market @_unmask {
    handle
    id
    name
    primary
    enabled
    # regions(first: 250) {
    #   nodes {
    #     id
    #     name
    #     ... on MarketRegionCountry {
    #       id
    #       name
    #       code
    #     }
    #   }
    # }
  }
`);
// #endregion

// #region Queries
export const getMarketsQuery = graphql(
  `
    query GetMarkets($limit: Int!, $cursor: String) {
      markets(first: $limit, after: $cursor) {
        nodes {
          ...MarketFields
        }
        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [pageInfoFragment, marketFieldsFragment]
);

// #endregion
