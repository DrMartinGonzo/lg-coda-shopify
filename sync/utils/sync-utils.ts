// #region Imports

import { AbstractModelGraphQlWithMetafields } from '../../models/graphql/AbstractModelGraphQlWithMetafields';
import { AbstractModelRestWithRestMetafields } from '../../models/rest/AbstractModelRestWithMetafields';
import { Stringified } from '../../types/utilities';

// #endregion

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
export function parseContinuationProperty<T>(
  text: Stringified<T> | undefined,
  reviver?: (key: any, value: any) => any
): T {
  if (text == undefined) return undefined;
  return JSON.parse(text);
}

export function restResourceSupportsMetafields(model: any): model is typeof AbstractModelRestWithRestMetafields {
  return (
    (model as typeof AbstractModelRestWithRestMetafields).metafieldRestOwnerType !== undefined &&
    (model as typeof AbstractModelRestWithRestMetafields).metafieldGraphQlOwnerType !== undefined
  );
}

// TODO
export function graphQlResourceSupportsMetafields(model: any): model is typeof AbstractModelGraphQlWithMetafields {
  return (
    (model as typeof AbstractModelGraphQlWithMetafields).metafieldRestOwnerType !== undefined &&
    (model as typeof AbstractModelGraphQlWithMetafields).metafieldGraphQlOwnerType !== undefined
  );
}
