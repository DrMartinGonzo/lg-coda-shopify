// #region Imports
import * as coda from '@codahq/packs-sdk';
import deepmerge from 'deepmerge';

import { IS_TEST_RELEASE } from '../pack-config.json';

// #endregion

// #region Predicates
export function isString(value: any) {
  return typeof value === 'string' || value instanceof String;
}

export function isObject(value: any) {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

/**
 * Checks if a value is nullish.
 * @param value The value to be checked for nullishness
 * @returns Returns true if the value is nullish; otherwise, returns false.
 */
export function isNullish(value: any) {
  return value === null || value === undefined;
}

/**
 * Checks if a value is defined but empty, taking into account all possible value types.
 * @param value The value to be checked for emptiness.
 * @returns Returns true if the value is empty; otherwise, returns false.
 */
export function isDefinedEmpty(value: any) {
  if (value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0 && !(value instanceof Date)) return true;

  return false;
}

/**
 * Checks if a value is nullish or empty, taking into account all possible value types.
 * @param value The value to be checked for nullishness or emptiness.
 * @returns Returns true if the value is nullish or empty; otherwise, returns false.
 */
export function isNullishOrEmpty(value: any) {
  return isNullish(value) || isDefinedEmpty(value);
}
// #endregion

// #region Log helpers
export function logAdmin(msg: any) {
  if (IS_TEST_RELEASE) {
    console.log(msg);
  }
}

export function dumpToConsole(data: any) {
  if (IS_TEST_RELEASE) {
    console.log(JSON.stringify(data, null, 2));
  }
}
// #endregion

// #region Date helpers
// Coda date to ISO Date helper
export function toIsoDate(convDate: Date): String {
  return convDate.toISOString();
}

// ISO Date to Coda date helper
export function toCodaDate(isoDateToConv: String): String {
  let date = isoDateToConv.toString();
  let codaDate = new Date(date).toLocaleDateString('us');
  return codaDate;
}

export function dateRangeMin(dateRange: Date[]) {
  return dateRange ? dateRange[0] : undefined;
}
export function dateRangeMax(dateRange: Date[]) {
  return dateRange ? dateRange[1] : undefined;
}
// #endregion

// #region OptionName helpers
/**
 * Sometimes, we will provide an input like `${name} (${id})`, formatted using formatOptionNameId()
 * This function parses the parameter value, extracting the ID from the
 * parenthesis, but also allows for cases where just the ID was passed in (via a
 * formula, etc).
 */
export function parseOptionId(label: string): number {
  if (!label) return undefined;
  if (!Number.isNaN(parseInt(label))) return Number(label);

  let match = label.match(/\((\d+)\)$/);
  if (!match) {
    throw new coda.UserVisibleError(`Invalid option: ${label}`);
  }
  return Number(match[1]);
}

export function formatOptionNameId(name: string, id: number): string {
  return `${trimStringWithEllipsis(name, 25)} (${id})`;
}
// #endregion

// #region @shopify/hydrogen-react
export function flattenConnection(connection) {
  if (!connection) {
    const noConnectionErr = `flattenConnection(): needs a 'connection' to flatten, but received '${
      connection ?? ''
    }' instead.`;
    {
      console.error(noConnectionErr + ` Returning an empty array`);
      return [];
    }
  }
  if ('nodes' in connection) {
    return connection.nodes;
  }
  if ('edges' in connection && Array.isArray(connection.edges)) {
    return connection.edges.map((edge) => {
      if (!(edge == null ? void 0 : edge.node)) {
        throw new Error('flattenConnection(): Connection edges must contain nodes');
      }
      return edge.node;
    });
  }
  return [];
}

type ShopifyGid = Pick<URL, 'search' | 'searchParams' | 'hash'> & {
  id: string;
  resource: string | null;
  resourceId: string | null;
};
/**
 * Taken from @shopify/hydrogen-react
 // TODO: Need to find a way to replace URLSearchParams with another parser as URLSearchParams does not work with Coda
 *  maybe https://www.npmjs.com/package/url-parse ?
 */
function parseGid(gid: string | undefined): ShopifyGid {
  const defaultReturn = {
    id: '',
    resource: null,
    resourceId: null,
    search: '',
    searchParams: new URLSearchParams(),
    hash: '',
  };
  if (typeof gid !== 'string') {
    return defaultReturn;
  }
  try {
    const { search, searchParams, pathname, hash } = new URL(gid);
    const pathnameParts = pathname.split('/');
    const lastPathnamePart = pathnameParts[pathnameParts.length - 1];
    const resourcePart = pathnameParts[pathnameParts.length - 2];
    if (!lastPathnamePart || !resourcePart) {
      return defaultReturn;
    }
    const id = `${lastPathnamePart}${search}${hash}` || '';
    const resourceId = lastPathnamePart || null;
    const resource = resourcePart ?? null;
    return { id, resource, resourceId, search, searchParams, hash };
  } catch {
    return defaultReturn;
  }
}

type DistributiveOmit<Value, Key extends PropertyKey> = Value extends unknown ? Omit<Value, Key> : never;

/**
 * Returns a new object with all specified keys excluded from the original object
 */
export function excludeObjectKeys<ObjectType extends Record<PropertyKey, any>, ExcludedKeys extends keyof ObjectType>(
  object: ObjectType,
  keysToFilterOut: readonly ExcludedKeys[]
): DistributiveOmit<ObjectType, ExcludedKeys> {
  return Object.keys(object)
    .filter((key) => !keysToFilterOut.includes(key as ExcludedKeys))
    .reduce((acc, key) => {
      acc[key] = object[key];
      return acc;
    }, {}) as DistributiveOmit<ObjectType, ExcludedKeys>;
}

export function excludeUndefinedObjectKeys<ObjT extends Record<PropertyKey, any>>(obj: ObjT) {
  const keysToOmit = Object.keys(obj).filter((key) => obj[key] === undefined);
  return excludeObjectKeys(obj, keysToOmit);
}
export function excludeNullishObjectKeys<ObjT extends Record<PropertyKey, any>>(obj: ObjT) {
  const keysToOmit = Object.keys(obj).filter((key) => isNullish(obj[key]));
  return excludeObjectKeys(obj, keysToOmit);
}

export function splitAndTrimValues(values = '', delimiter = ','): string[] {
  return values.split(delimiter).map((s) => s.trim());
}
// #endregion

// #region String helpers
export function capitalizeFirstChar(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function trimStringWithEllipsis(inputString: string, maxLength: number) {
  if (inputString.length > maxLength) {
    return inputString.substring(0, maxLength - 1) + '…';
  }
  return inputString;
}
// #endregion

/**
 * Try to parse a json string, if it fails return the original value
 */
export function maybeParseJson(value: any) {
  if (!value) return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

export function arrayUnique<T = any>(array: T[]) {
  return Array.from(new Set(array));
}

export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Takes an object and returns the key associated with the given value in the object */
export function getKeyFromValue<T extends object>(obj: T, value: T[keyof T]): keyof T {
  return Object.keys(obj).find((key) => obj[key] === value) as keyof T;
}

export function compareByDisplayKey(a: any, b: any) {
  return a.display.localeCompare(b.display);
}
export function compareByValueKey(a: any, b: any) {
  return a.value.localeCompare(b.value);
}

const overwriteMerge = (destinationArray: any[], sourceArray: any[], options: deepmerge.ArrayMergeOptions) =>
  sourceArray;

export function safeToString(value?: any): string | undefined {
  return isNullish(value) ? undefined : value.toString();
}
export function safeToFloat(value?: any): number | undefined {
  return isNullish(value) ? undefined : parseFloat(value);
}
function safeToInt(value?: any): number | undefined {
  return isNullish(value) ? undefined : parseInt(value, 10);
}

export function assertAllowedValue(values: any | any[], allowedValues: any[]) {
  if (values) {
    return !(Array.isArray(values) ? values : [values]).some((value) => !allowedValues.includes(value));
  }
}
export function assertNotBlank(value: any) {
  return !isDefinedEmpty(value);
}

export function reverseMap<T extends string | number | symbol, K extends string | number | symbol>(
  map: Partial<Record<T, K>>
) {
  const reversedMap: Partial<Record<K, T>> = {};
  for (const key in map) {
    reversedMap[map[key]] = key;
  }
  return reversedMap as Record<K, T>;
}
