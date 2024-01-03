export function buildUpdateCollection() {
  return `#graphql
    mutation collectionUpdate($input: CollectionInput!) {
      collectionUpdate(input: $input) {
        collection {
          handle
          descriptionHtml
          templateSuffix
          title
        }
        userErrors {
          field
          message
        }
      }
    }`;
}

export const isSmartCollection = `#graphql
  query querySingleCollection($gid: ID!) {
    collection(id: $gid) {
      # will be null for non smart collections
      isSmartCollection: ruleSet {
          appliedDisjunctively
      }
    }
  }
`;
