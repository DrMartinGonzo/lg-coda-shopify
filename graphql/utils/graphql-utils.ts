// #region Imports
import { FragmentOf, initGraphQLTada, readFragment } from 'gql.tada';

import { FormattingError, InvalidValueError } from '../../Errors/Errors';
import { GraphQlResourceName } from '../../models/types/SupportedResource';
import { introspection } from '../../types/graphql-env.js';
import { isNullish } from '../../utils/helpers';

// #endregion

// #region GraphQL Tada
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
// #endregion

// #region GID conversion
function isGraphQlGid(gid: string) {
  if (gid.startsWith('gid://shopify/')) return true;
  return false;
}

export function idToGraphQlGid(resourceName: GraphQlResourceName, id: number | string): string | undefined {
  if (isNullish(id)) return undefined;
  if (typeof id === 'string' && isGraphQlGid(id)) {
    return id as string;
  }
  if (resourceName === undefined || id === undefined || typeof id !== 'number') {
    throw new FormattingError('GraphQlGid', resourceName, id);
  }
  return `gid://shopify/${resourceName}/${id}`;
}

export function graphQlGidToId(gid: string): number | undefined {
  if (isNullish(gid)) return undefined;
  if (!isGraphQlGid(gid)) throw new InvalidValueError('GID', gid);
  if (!Number.isNaN(parseInt(gid))) return Number(gid);

  const maybeNum = gid.split('/').at(-1)?.split('?').at(0);
  if (maybeNum) {
    return Number(maybeNum);
  }
  throw new InvalidValueError('GID', gid);
}

export function graphQlGidToResourceName(gid: string): GraphQlResourceName | undefined {
  if (isNullish(gid)) return undefined;
  if (!isGraphQlGid(gid)) throw new InvalidValueError('GID', gid);
  return gid.split('gid://shopify/').at(1)?.split('/').at(0) as GraphQlResourceName;
}
// #endregion
