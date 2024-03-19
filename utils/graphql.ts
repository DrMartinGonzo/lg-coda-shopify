import { FragmentOf, initGraphQLTada, readFragment } from 'gql.tada';
import type { introspection } from '../types/graphql-env.js';

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    ID: string;
    String: string;
    Boolean: boolean;
    Int: number;
    Float: number;
    ARN: any;
    Date: any;
    DateTime: any;
    Decimal: any;
    FormattedString: any;
    HTML: any;
    JSON: any;
    Money: any;
    StorefrontID: any;
    URL: any;
    UnsignedInt64: any;
    UtcOffset: any;
  };
}>();

/**
 * Helper function that loops over each fragment result and return the unmasked
 * fragment. Same as direlty applying readFragment on the array, but the result
 * is not readonly
 */
export const readFragmentArray = <DocT>(document: DocT, items: Array<FragmentOf<DocT>>) =>
  items.map((item) => readFragment(document, item));

export type { ResultOf, VariablesOf } from 'gql.tada';
export { readFragment };
export type { FragmentOf };
