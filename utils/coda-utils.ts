// #region Imports
import * as coda from '@codahq/packs-sdk';
import { normalizeSchemaKey } from '@codahq/packs-sdk/dist/schema';

// #endregion

/**
 * Taken from Coda sdk
 */
export function transformToArraySchema(schema?: any) {
  if (schema?.type === coda.ValueType.Array) {
    return schema;
  } else {
    return {
      type: coda.ValueType.Array,
      items: schema,
    };
  }
}

/**
 * Retrieve all object schema keys or fromKeys if present
 */
export function retrieveObjectSchemaEffectiveKeys(schema: coda.Schema) {
  // make it easier if the caller simply passed in the full sync schema.
  if (schema.type === coda.ValueType.Array) schema = schema.items;
  if (schema.type !== coda.ValueType.Object) return;

  const properties = schema.properties;
  return Object.keys(properties).map((key) => getObjectSchemaEffectiveKey(schema, key));
}

/**
 * Get a single object schema keys or fromKey if present
 */
export function getObjectSchemaEffectiveKey(schema: coda.Schema, key: string) {
  // make it easier if the caller simply passed in the full sync schema.
  if (schema.type === coda.ValueType.Array) schema = schema.items;
  if (schema.type !== coda.ValueType.Object) return;

  const properties = schema.properties;
  if (properties.hasOwnProperty(key)) {
    const property = properties[key];
    const propKey = property.hasOwnProperty('fromKey') ? property.fromKey : key;
    return propKey;
  }
  throw new Error(`Schema doesn't have ${key} property`);
}

export function getObjectSchemaNormalizedKey(schema: coda.Schema, fromKey: string) {
  // make it easier if the caller simply passed in the full sync schema.
  if (schema.type === coda.ValueType.Array) schema = schema.items;
  if (schema.type !== coda.ValueType.Object) return;

  const properties = schema.properties;
  let found = fromKey;
  Object.keys(properties).forEach((propKey) => {
    const property = properties[propKey];
    if (property.hasOwnProperty('fromKey') && property.fromKey === fromKey) {
      if (property.hasOwnProperty('fixedId')) {
        found = property.fixedId;
        return;
      }
    }
  });
  return normalizeSchemaKey(found);
}
