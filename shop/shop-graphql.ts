// #region Queries
export const queryOnlineStorePublication = /* GraphQL */ `
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
`;

// #endregion
