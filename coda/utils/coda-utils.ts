// #region Imports
import * as coda from '@codahq/packs-sdk';
import { CACHE_DEFAULT } from '../../constants/cacheDurations-constants';
import { AutocompleteParameterTypes } from '@codahq/packs-sdk/dist/api';

// #endregion

/**
 * Takes an array of {@link coda.MetadataFormulaObjectResultType} objects
 * and returns an array containing only the value field of each object.
 */
export function optionValues<T extends AutocompleteParameterTypes>(options: coda.SimpleAutocompleteOption<T>[]) {
  return options.map((status) => status.value);
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
 * Create a basic formula to fetch a single Rest resource and return raw JSON
 */
export function makeFetchSingleRestResourceAsJsonAction({
  modelName,
  IdParameter,
  execute,
}: Omit<MakeRestFetchResourceActionParams, 'schema'>) {
  return coda.makeFormula({
    name: `${modelName}JSON`,
    isExperimental: true,
    description: `Return a single ${modelName} from this shop as raw JSON.`,
    connectionRequirement: coda.ConnectionRequirement.Required,
    parameters: [IdParameter],
    // small cache because we likely want fresh results when fetching as RAW Json
    cacheTtlSecs: 10,
    resultType: coda.ValueType.String,
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
