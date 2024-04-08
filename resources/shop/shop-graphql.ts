import { graphql } from '../../utils/graphql';

// #region Queries
export const getOnlineStorePublicationQuery = graphql(
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
