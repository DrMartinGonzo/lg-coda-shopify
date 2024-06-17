// #region Imports

import { TadaDocumentNode } from 'gql.tada';
import { UnsupportedValueError } from '../Errors/Errors';
import { MetafieldOwnerType } from '../types/admin.types';
import { capitalizeFirstChar } from '../utils/helpers';
import { pageInfoFragment } from './sharedFragments-graphql';
import { graphql } from './utils/graphql-utils';

// #endregion

// #region Fragments
const metafieldOwnerNodeFragment = graphql(
  `
    fragment MetafieldOwnerNodeFields on Node @_unmask {
      id
      __typename

      ... on ProductVariant {
        parentOwner: product {
          id
        }
      }
    }
  `
);

/** Pas besoin d'inclure owner pour chaque requête vu qu'on pourra le déduire
 * quand on query une liste de metafields. Par contre on ne le déduit pas quand
 * c'est un single */
export const metafieldFieldsFragment = graphql(`
  fragment MetafieldFields on Metafield @_unmask {
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
    fragment MetafieldWithDefinitionFields on Metafield @_unmask {
      ...MetafieldFields
      definition {
        id
      }
    }
  `,
  [metafieldFieldsFragment]
);

export const metafieldFieldsFragmentWithDefinitionWithOwner = graphql(
  `
    fragment MetafieldWithDefinitionWithOwnerFields on Metafield @_unmask {
      ...MetafieldWithDefinitionFields
      owner {
        ...MetafieldOwnerNodeFields
      }
    }
  `,
  [metafieldFieldsFragmentWithDefinition, metafieldOwnerNodeFragment]
);

const resourceWithMetafieldsFragment = graphql(
  `
    fragment ResourceWithMetafields on Node @_unmask {
      ...MetafieldOwnerNodeFields
      ... on HasMetafields {
        metafields(keys: $metafieldKeys, first: $countMetafields) {
          nodes {
            ...MetafieldWithDefinitionFields
          }
        }
      }
    }
  `,
  [metafieldOwnerNodeFragment, metafieldFieldsFragmentWithDefinition]
);
// #endregion

// #region Queries
export const getSingleMetafieldQuery = graphql(
  `
    query GetSingleMetafield($id: ID!) {
      node(id: $id) {
        ... on Metafield {
          ...MetafieldWithDefinitionWithOwnerFields
        }
      }
    }
  `,
  [metafieldFieldsFragmentWithDefinitionWithOwner]
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
        ...MetafieldOwnerNodeFields
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
  [metafieldOwnerNodeFragment, metafieldFieldsFragmentWithDefinition]
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
function makeResourceMetafieldsByKeysQuery<T extends SupportedGraphQlMetafieldOperation>(graphQlOperation: T) {
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

const ownerTypeToGraphQlOperationMap = {
  [MetafieldOwnerType.Collection]: 'collections',
  [MetafieldOwnerType.Customer]: 'customers',
  [MetafieldOwnerType.Draftorder]: 'draftOrders',
  [MetafieldOwnerType.Location]: 'locations',
  [MetafieldOwnerType.MediaImage]: 'files',
  [MetafieldOwnerType.Order]: 'orders',
  [MetafieldOwnerType.Product]: 'products',
  [MetafieldOwnerType.Productvariant]: 'productVariants',
} as const;

export type SupportedGraphQlMetafieldOperation =
  (typeof ownerTypeToGraphQlOperationMap)[keyof typeof ownerTypeToGraphQlOperationMap];

/**
 * Returns the appropriate GraphQL Operation based on the given MetafieldOwnerType.
 *
 * @throws {Error} If there is no matching graphQlOperation for the given MetafieldOwnerType.
 */
export function getMetafieldsByKeysGraphQlOperation(ownerType: MetafieldOwnerType) {
  const map = ownerTypeToGraphQlOperationMap;
  if (ownerType in map) return map[ownerType] as (typeof map)[keyof typeof map];
  throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
}

/**
 * Returns the appropriate GraphQL DocumentNode based on the given MetafieldOwnerType.
 *
 * @param {MetafieldOwnerType} metafieldOwnerType - The type of the metafield owner.
 */
export function getResourceMetafieldsByKeysQueryFromOwnerType(
  metafieldOwnerType: MetafieldOwnerType
): TadaDocumentNode {
  if (metafieldOwnerType === MetafieldOwnerType.Shop) {
    return getShopMetafieldsByKeysQuery;
  }
  return makeResourceMetafieldsByKeysQuery(getMetafieldsByKeysGraphQlOperation(metafieldOwnerType));
}
// #endregion

// #region Mutations
export const setMetafieldsMutation = graphql(
  `
    mutation SetMetafields($inputs: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $inputs) {
        metafields {
          ...MetafieldWithDefinitionWithOwnerFields
        }
        userErrors {
          field
          message
        }
      }
    }
  `,
  [metafieldFieldsFragmentWithDefinitionWithOwner]
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
