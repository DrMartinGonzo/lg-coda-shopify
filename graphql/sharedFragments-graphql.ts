// #region Imports
import { graphql } from './utils/graphql-utils';

// #endregion

export const pageInfoFragment = graphql(`
  fragment PageInfoFields on PageInfo @_unmask {
    hasNextPage
    endCursor
  }
`);
