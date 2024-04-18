// #region Imports
import { graphql } from '../utils/tada-utils';

// #endregion

export const pageInfoFragment = graphql(`
  fragment PageInfoFields on PageInfo {
    hasNextPage
    endCursor
  }
`);
