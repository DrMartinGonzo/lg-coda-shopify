// #region Imports
import { FormattingError, InvalidValueError } from '../Errors/Errors';
import { GraphQlResourceName } from '../Resources/types/SupportedResource';
import { isNullish } from './helpers';

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

function graphQlGidToResourceName(gid: string): GraphQlResourceName | undefined {
  if (isNullish(gid)) return undefined;
  if (!isGraphQlGid(gid)) throw new InvalidValueError('GID', gid);
  return gid.split('gid://shopify/').at(1)?.split('/').at(0) as GraphQlResourceName;
}
// #endregion
