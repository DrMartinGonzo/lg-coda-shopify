import { graphql } from '../../types/graphql';

// #region Queries
export const queryOnlineStorePublication = graphql(
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
// #endregion
