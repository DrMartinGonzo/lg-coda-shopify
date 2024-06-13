// #region Imports
import * as coda from '@codahq/packs-sdk';
import { normalizeSchemaKey } from '@codahq/packs-sdk/dist/schema';
import { InvalidValueError } from '../Errors/Errors';
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
function retrieveObjectSchemaEffectiveKeys(schema: coda.Schema) {
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

export function getObjectSchemaRowKeys(schema: coda.Schema) {
  const objectSchema = requireObjectSchema(schema);
  const properties = objectSchema.properties;
  return Object.keys(properties).map((propKey) => {
    const property = properties[propKey];
    return property.hasOwnProperty('fixedId') ? property.fixedId : propKey;
  });
}

// #region Coda Actions and Formula factories
interface MakeRestResourceActionParams {
  /** the resource Identity name */
  modelName: string;
  IdParameter: ReturnType<
    typeof coda.makeParameter<
      coda.ParameterType.Number,
      { type: coda.ParameterType.Number; name: string; description: string }
    >
  >;
  execute: (params: coda.ParamValues<coda.ParamDefs>, context: coda.ExecutionContext) => Promise<any>;
}
interface MakeRestDeleteResourceActionParams extends MakeRestResourceActionParams {}
interface MakeRestFetchResourceActionParams extends MakeRestResourceActionParams {
  schema: coda.ObjectSchema<string, string>;
}

/**
 * Create a basic formula to delete a single Rest resource
 * @param modelName
 * @param IdParameter the id parameter
 * @param execute
 */
export function makeDeleteRestResourceAction({ modelName, IdParameter, execute }: MakeRestDeleteResourceActionParams) {
  return coda.makeFormula({
    name: `Delete${modelName}`,
    description: `Delete an existing Shopify ${modelName} and return \`true\` on success.`,
    connectionRequirement: coda.ConnectionRequirement.Required,
    parameters: [IdParameter],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute,
  });
}

/**
 * Create a basic formula to fetch a single Rest resource
 * @param modelName
 * @param IdParameter the id parameter
 * @param schema
 * @param execute
 */
export function makeFetchSingleRestResourceAction({
  modelName,
  IdParameter,
  schema,
  execute,
}: MakeRestFetchResourceActionParams) {
  return coda.makeFormula({
    name: modelName,
    description: `Return a single ${modelName} from this shop.`,
    connectionRequirement: coda.ConnectionRequirement.Required,
    parameters: [IdParameter],
    cacheTtlSecs: CACHE_DEFAULT,
    resultType: coda.ValueType.Object,
    schema,
    execute,
  });
}

/**
 * Create a basic formula to delete a single GraphQL resource
 * @param Resource the resource class
 * @param IdParameter the id parameter
 */
export function makeDeleteGraphQlResourceAction({
  modelName,
  IdParameter,
  execute,
}: MakeRestDeleteResourceActionParams) {
  return coda.makeFormula({
    name: `Delete${modelName}`,
    description: `Delete an existing Shopify ${modelName} and return \`true\` on success.`,
    connectionRequirement: coda.ConnectionRequirement.Required,
    parameters: [IdParameter],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute,
  });
}
// #endregion
