// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResourceUnion } from '../resources/Resource.types';

// #endregion

export function handleDeleteNotFound(resource: ResourceUnion, identifier: number | string) {
  console.error(`${resource.display} \`${identifier}\` not found. Possibly already deleted.`);
}
export function handleDeleteNotFoundNEW(name: string, identifier: number | string) {
  console.error(`${name} \`${identifier}\` not found. Possibly already deleted.`);
}
export function handleDeleteError(error: any, resource: ResourceUnion, id: number | string) {
  // If the request failed because the server returned a 300+ status code.
  if (coda.StatusCodeError.isStatusCodeError(error)) {
    const statusError = error as coda.StatusCodeError;
    if (statusError.statusCode === 404) {
      handleDeleteNotFound(resource, id);
    }
  }
  // The request failed for some other reason. Re-throw the error so that it bubbles up.
  throw error;
}

export type Stringified<T> = string & {
  [P in keyof T]: { '_ value': T[P] };
};
/**
 * Serializes a value to a JSON string with a special type to ensure that the
 * resulting string can be used to recreate the original value.
 *
 * @param value The value to serialize.
 * @param replacer An optional function used to transform values before they
 * are serialized.
 * @param space An optional string or number used to add indentation,
 * white space, and line breaks to the resulting JSON.
 * @returns A string that contains the JSON representation of the given value
 * with a special type to ensure it can be used to recreate the original value.
 */

export function stringifyContinuationProperty<T>(
  value: T,
  replacer?: (key: string, value: any) => any,
  space?: string | number
): string & Stringified<T> {
  return JSON.stringify(value, replacer, space) as string & Stringified<T>;
}
/**
 * Parses a JSON string with a special type created by
 * `stringifyContinuationProperty` to recreate the original value.
 *
 * @param text The string to parse.
 * @param reviver An optional function used to transform values after they
 * are parsed.
 * @returns The original value recreated from the parsed string.
 */

export function parseContinuationProperty<T>(text: Stringified<T>, reviver?: (key: any, value: any) => any): T {
  return JSON.parse(text);
}