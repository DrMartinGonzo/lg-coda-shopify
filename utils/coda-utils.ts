// #region Imports
import * as coda from '@codahq/packs-sdk';
import { normalizeSchemaKey } from '@codahq/packs-sdk/dist/schema';
import { InvalidValueError, NotFoundVisibleError } from '../Errors/Errors';
import { AbstractGraphQlResource } from '../Resources/Abstract/GraphQl/AbstractGraphQlResource';
import { AbstractRestResource } from '../Resources/Abstract/Rest/AbstractRestResource';
import { CACHE_DEFAULT } from '../constants';

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
 * Make it easier if the caller simply passed in the full sync schema.
 * @param schema
 */
function requireObjectSchema(schema: coda.Schema): coda.GenericObjectSchema {
  let objectSchema = schema;
  if (objectSchema.type === coda.ValueType.Array) objectSchema = objectSchema.items;
  if (objectSchema.type !== coda.ValueType.Object) {
    throw new InvalidValueError('ObjectSchema', objectSchema);
  }
  return objectSchema;
}

/**
 * Retrieve all object schema keys or fromKeys if present
 */
export function retrieveObjectSchemaEffectiveKeys(schema: coda.Schema) {
  const objectSchema = requireObjectSchema(schema);
  const properties = objectSchema.properties;
  return Object.keys(properties).map((key) => getObjectSchemaEffectiveKey(objectSchema, key));
}

/**
 * Get a single object schema keys or fromKey if present
 */
export function getObjectSchemaEffectiveKey(schema: coda.Schema, key: string) {
  const objectSchema = requireObjectSchema(schema);
  const properties = objectSchema.properties;
  if (properties.hasOwnProperty(key)) {
    const property = properties[key];
    const propKey = property.hasOwnProperty('fromKey') ? property.fromKey : key;
    return propKey;
  }
  throw new Error(`Schema doesn't have ${key} property`);
}

export function getObjectSchemaNormalizedKey(schema: coda.Schema, fromKey: string) {
  const objectSchema = requireObjectSchema(schema);
  const properties = objectSchema.properties;
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

// #region Coda Actions and Formula factories
/**
 * Create a basic formula to delete a single Rest resource
 * @param Resource the resource class
 * @param IdParameter the id parameter
 */
export function makeDeleteRestResourceAction(
  Resource: typeof AbstractRestResource,
  IdParameter: ReturnType<
    typeof coda.makeParameter<
      coda.ParameterType.Number,
      { type: coda.ParameterType.Number; name: string; description: string }
    >
  >
) {
  return coda.makeFormula({
    name: `Delete${Resource.displayName}`,
    description: `Delete an existing Shopify ${Resource.displayName} and return \`true\` on success.`,
    connectionRequirement: coda.ConnectionRequirement.Required,
    parameters: [IdParameter],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async ([itemId], context) => {
      if ('delete' in Resource && typeof Resource.delete === 'function') {
        await Resource.delete({ context, id: itemId });
        return true;
      }
      throw new Error("Resource doesn't have 'delete' method");
    },
  });
}

/**
 * Create a basic formula to fetch a single Rest resource
 * @param Resource the resource class
 * @param IdParameter the id parameter
 */
export function makeFetchSingleRestResourceAction(
  Resource: typeof AbstractRestResource,
  IdParameter: ReturnType<
    typeof coda.makeParameter<
      coda.ParameterType.Number,
      { type: coda.ParameterType.Number; name: string; description: string }
    >
  >
) {
  return coda.makeFormula({
    name: Resource.displayName,
    description: `Return a single ${Resource.displayName} from this shop.`,
    connectionRequirement: coda.ConnectionRequirement.Required,
    parameters: [IdParameter],
    cacheTtlSecs: CACHE_DEFAULT,
    resultType: coda.ValueType.Object,
    schema: Resource.getStaticSchema(),
    execute: async ([itemId], context) => {
      if ('find' in Resource && typeof Resource.find === 'function') {
        const item = await Resource.find({ context, id: itemId });
        if (item) {
          return item.formatToRow();
        }
        throw new NotFoundVisibleError(Resource.displayName);
      }
      throw new Error("Resource doesn't have 'find' method");
    },
  });
}

/**
 * Create a basic formula to delete a single GraphQL resource
 * @param Resource the resource class
 * @param IdParameter the id parameter
 */
export function makeDeleteGraphQlResourceAction(
  Resource: typeof AbstractGraphQlResource,
  IdParameter: ReturnType<
    typeof coda.makeParameter<
      coda.ParameterType.Number | coda.ParameterType.String,
      { type: coda.ParameterType.Number | coda.ParameterType.String; name: string; description: string }
    >
  >,
  deleteMethod: (params: { context: coda.ExecutionContext; id: number | string }) => any
) {
  return coda.makeFormula({
    name: `Delete${Resource.displayName}`,
    description: `Delete an existing Shopify ${Resource.displayName} and return \`true\` on success.`,
    connectionRequirement: coda.ConnectionRequirement.Required,
    parameters: [IdParameter],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async ([itemId], context) => {
      await deleteMethod({ context, id: itemId });
      return true;
    },
  });
}
// #endregion
