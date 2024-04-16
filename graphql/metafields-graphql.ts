// #region Imports

import { TadaDocumentNode } from 'gql.tada';
import { UnsupportedValueError } from '../Errors/Errors';
import { MetafieldOwnerType } from '../types/admin.types';
import { graphql } from '../utils/tada-utils';
import { capitalizeFirstChar } from '../utils/helpers';

// #endregion

// #region Fragments
export const pageInfoFragment = graphql(`
  fragment PageInfoFields on PageInfo {
    hasNextPage
    endCursor
  }
`);

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

// TODO: j'aimerais faire en sorte de ne pas répéter les champs de MetafieldFieldsFragment mais ça pose trop de problèmes avec gql-tada
// peut être en faisant une string partagéé entre les deux définie comme 'as const' dans Typescript ?
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

const resourceWithMetafieldsFragment = graphql(
  `
    fragment ResourceWithMetafields on Node {
      id
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

const ProductVariantWithMetafieldsFragment = graphql(
  `
    fragment ProductVariantWithMetafields on ProductVariant {
      id
      parentOwner: product {
        id
      }
      metafields(keys: $metafieldKeys, first: $countMetafields) {
        nodes {
          ...MetafieldWithDefinitionFields
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
        id
        __typename
        ... on HasMetafields {
          metafields(keys: $metafieldKeys, first: $countMetafields) {
            nodes {
              ...MetafieldFields
            }
          }
        }
      }
    }
  `,
  [metafieldFieldsFragment]
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
function makeResourceMetafieldsByKeysQuery<T extends string, K extends TadaDocumentNode>(graphQlOperation: T, lol?: K) {
  const queryName = `Get${capitalizeFirstChar(graphQlOperation)}MetafieldsByKeys`;
  return graphql(
    `
      query GetResourceMetafieldsByKeys(
        $metafieldKeys: [String!]
        $countMetafields: Int!
        $maxEntriesPerRun: Int!
        $cursor: String
      ) {
        ${graphQlOperation}(first: $maxEntriesPerRun, after: $cursor) {
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

const queryFileMetafieldsByKeys = makeResourceMetafieldsByKeysQuery('files');
const queryCollectionMetafieldsByKeys = makeResourceMetafieldsByKeysQuery('collections');
const queryCustomerMetafieldsByKeys = makeResourceMetafieldsByKeysQuery('customers');
const queryDraftOrderMetafieldsByKeys = makeResourceMetafieldsByKeysQuery('draftOrders');
const queryLocationMetafieldsByKeys = makeResourceMetafieldsByKeysQuery('locations');
const queryOrderMetafieldsByKeys = makeResourceMetafieldsByKeysQuery('orders');
const queryProductVariantMetafieldsByKeys = graphql(
  `
    query GetProductVariantsMetafieldsByKeys(
      $metafieldKeys: [String!]
      $countMetafields: Int!
      $maxEntriesPerRun: Int!
      $cursor: String
    ) {
      productVariants(first: $maxEntriesPerRun, after: $cursor) {
        nodes {
          ...ProductVariantWithMetafields
        }
        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [ProductVariantWithMetafieldsFragment, pageInfoFragment]
);
const queryProductMetafieldsByKeys = makeResourceMetafieldsByKeysQuery('products');

/**
 * Returns the appropriate GraphQL DocumentNode based on the given MetafieldOwnerType.
 *
 * @param {MetafieldOwnerType} metafieldOwnerType - The type of the metafield owner.
 * @return {TadaDocumentNode} The DocumentNode query corresponding to the owner type.
 * @throws {Error} If there is no matching DocumentNode for the given MetafieldOwnerType.
 */
export function getResourceMetafieldsByKeysQueryFromOwnerType(
  metafieldOwnerType: MetafieldOwnerType
): TadaDocumentNode {
  switch (metafieldOwnerType) {
    case MetafieldOwnerType.Shop:
      return getShopMetafieldsByKeysQuery;
    case MetafieldOwnerType.Collection:
      return queryCollectionMetafieldsByKeys;
    case MetafieldOwnerType.Customer:
      return queryCustomerMetafieldsByKeys;
    case MetafieldOwnerType.Draftorder:
      return queryDraftOrderMetafieldsByKeys;
    case MetafieldOwnerType.Location:
      return queryLocationMetafieldsByKeys;
    case MetafieldOwnerType.MediaImage:
      return queryFileMetafieldsByKeys;
    case MetafieldOwnerType.Order:
      return queryOrderMetafieldsByKeys;
    case MetafieldOwnerType.Product:
      return queryProductMetafieldsByKeys;
    case MetafieldOwnerType.Productvariant:
      return queryProductVariantMetafieldsByKeys;
  }

  throw new UnsupportedValueError('MetafieldOwnerType', metafieldOwnerType);
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
