// #region Imports

import { TadaDocumentNode } from 'gql.tada';
import { UnsupportedValueError } from '../Errors/Errors';
import { MetafieldOwnerType } from '../types/admin.types';
import { capitalizeFirstChar } from '../utils/helpers';
import { graphql } from '../utils/tada-utils';
import { pageInfoFragment } from './sharedFragments-graphql';

// #endregion

// #region Fragments
export const metafieldFieldsFragment = graphql(`
  fragment MetafieldFields on Metafield {
    __typename
    id
    namespace
    key
    type
    value
    ownerType
    createdAt
    updatedAt
  }
`);

export const metafieldFieldsFragmentWithDefinition = graphql(
  `
    fragment MetafieldWithDefinitionFields on Metafield {
      __typename
      id
      namespace
      key
      type
      value
      ownerType
      createdAt
      updatedAt
      definition {
        id
      }
    }
  `
);

// export type MetafieldFragmentWithDefinition = Omit<
//   ResultOf<typeof metafieldFieldsFragmentWithDefinition>,
//   'fragmentRefs'
// > &
//   Omit<ResultOf<typeof metafieldFieldsFragment>, 'fragmentRefs'>;

const resourceWithMetafieldsFragment = graphql(
  `
    fragment ResourceWithMetafields on Node {
      id
      ... on ProductVariant {
        parentOwner: product {
          id
        }
      }
      __typename
      ... on HasMetafields {
        metafields(keys: $metafieldKeys, first: $countMetafields) {
          nodes {
            ...MetafieldWithDefinitionFields
          }
        }
      }
    }
  `,
  [metafieldFieldsFragmentWithDefinition]
);
// #endregion

// #region Queries
export const getSingleMetafieldQuery = graphql(
  `
    query GetSingleMetafield($id: ID!) {
      node(id: $id) {
        ... on Metafield {
          ...MetafieldWithDefinitionFields
        }
      }
    }
  `,
  [metafieldFieldsFragmentWithDefinition]
);

/**
 * Get Metafields from multiple nodes by their keys.
 * There is a maximum of 250 ids and 250 metafields keys per request.
 */
export const getNodesMetafieldsByKeyQuery = graphql(
  `
    query GetNodesMetafieldsByKey($ids: [ID!]!, $metafieldKeys: [String!], $countMetafields: Int) {
      nodes(ids: $ids) {
        ...ResourceWithMetafields
      }
    }
  `,
  [resourceWithMetafieldsFragment]
);

/**
 * Get Metafields from a single node by their keys.
 * There is a maximum of 250 metafields keys per request.
 */
export const getSingleNodeMetafieldsByKeyQuery = graphql(
  `
    query GetSingleNodeMetafieldsByKey($ownerGid: ID!, $metafieldKeys: [String!], $countMetafields: Int!) {
      node(id: $ownerGid) {
        id
        __typename
        ... on ProductVariant {
          parentOwner: product {
            id
          }
        }
        ... on HasMetafields {
          metafields(keys: $metafieldKeys, first: $countMetafields) {
            nodes {
              ...MetafieldWithDefinitionFields
            }
          }
        }
      }
    }
  `,
  [metafieldFieldsFragmentWithDefinition]
);

/**
 * Edge case: Same as querySingleNodeMetafieldsByKey but for Shop, which don't require a Gid.
 * There is a maximum of 250 metafields keys per request.
 */
export const getShopMetafieldsByKeysQuery = graphql(
  `
    query GetShopMetafieldsByKey($metafieldKeys: [String!], $countMetafields: Int!) {
      shop {
        id
        metafields(keys: $metafieldKeys, first: $countMetafields) {
          nodes {
            ...MetafieldWithDefinitionFields
          }
        }
      }
    }
  `,
  [metafieldFieldsFragmentWithDefinition]
);

/**
 * Create a GraphQl query to get metafields by their keys from resources (except Shop)
 */
function makeResourceMetafieldsByKeysQuery<T extends string>(graphQlOperation: T) {
  const queryName = `Get${capitalizeFirstChar(graphQlOperation)}MetafieldsByKeys`;
  return graphql(
    `
      query GetResourceMetafieldsByKeys(
        $metafieldKeys: [String!]
        $countMetafields: Int!
        $limit: Int!
        $cursor: String
      ) {
        ${graphQlOperation}(first: $limit, after: $cursor) {
          nodes {
            ...ResourceWithMetafields
          }
          pageInfo {
            ...PageInfoFields
          }
        }
      }
    `,
    [resourceWithMetafieldsFragment, pageInfoFragment]
  );
}

/**
 * Returns the appropriate GraphQL DocumentNode based on the given MetafieldOwnerType.
 *
 * @param {MetafieldOwnerType} metafieldOwnerType - The type of the metafield owner.
 * @throws {Error} If there is no matching DocumentNode for the given MetafieldOwnerType.
 */
export function getResourceMetafieldsByKeysQueryFromOwnerType(
  metafieldOwnerType: MetafieldOwnerType
): TadaDocumentNode {
  if (metafieldOwnerType === MetafieldOwnerType.Shop) {
    return getShopMetafieldsByKeysQuery;
  }

  let graphQlOperation: string;
  switch (metafieldOwnerType) {
    case MetafieldOwnerType.Collection:
      graphQlOperation = 'collections';
      break;
    case MetafieldOwnerType.Customer:
      graphQlOperation = 'customers';
      break;
    case MetafieldOwnerType.Draftorder:
      graphQlOperation = 'draftOrders';
      break;
    case MetafieldOwnerType.Location:
      graphQlOperation = 'locations';
      break;
    case MetafieldOwnerType.MediaImage:
      graphQlOperation = 'files';
      break;
    case MetafieldOwnerType.Order:
      graphQlOperation = 'orders';
      break;
    case MetafieldOwnerType.Product:
      graphQlOperation = 'products';
      break;
    case MetafieldOwnerType.Productvariant:
      graphQlOperation = 'productVariants';
      break;
  }
  if (graphQlOperation === undefined) {
    throw new UnsupportedValueError('MetafieldOwnerType', metafieldOwnerType);
  }
  return makeResourceMetafieldsByKeysQuery(graphQlOperation);
}
// #endregion

// #region Mutations
export const setMetafieldsMutation = graphql(
  `
    mutation SetMetafields($inputs: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $inputs) {
        metafields {
          owner {
            ... on Node {
              id
            }
          }
          ...MetafieldWithDefinitionFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  [metafieldFieldsFragmentWithDefinition]
);

export const deleteMetafieldMutation = graphql(
  `
    mutation metafieldDelete($input: MetafieldDeleteInput!) {
      metafieldDelete(input: $input) {
        deletedId
        userErrors {
          field
          message
        }
      }
    }
  `
);
// #endregion
