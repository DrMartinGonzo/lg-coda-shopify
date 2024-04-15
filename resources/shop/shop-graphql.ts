// #region Imports
import { graphql } from '../../utils/graphql';

// #endregion

// #region Queries
const getOnlineStorePublicationQuery = graphql(
  `
    query GetOnlineStorePublication {
      appByHandle(handle: "online_store") {
        id
        handle
        title
        installation {
          publication {
            id
          }
        }
      }
    }
  `
);

export const throttleStatusQuery = graphql(`
  query ThrottleStatus {
    shop {
      id
    }
  }
`);
// #endregion
