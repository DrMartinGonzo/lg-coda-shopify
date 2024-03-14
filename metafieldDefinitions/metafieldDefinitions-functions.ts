// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CACHE_DEFAULT } from '../constants';
import { getGraphQlResourceFromMetafieldOwnerType, graphQlGidToId, makeGraphQlRequest } from '../helpers-graphql';
import { MetafieldDefinitionValidationStatus, MetafieldOwnerType } from '../types/admin.types';
import { METAFIELD_TYPES } from '../metafields/metafields-constants';
import { getMetaFieldFullKey } from '../metafields/metafields-functions';
import { QuerySingleMetafieldDefinition, queryMetafieldDefinitions } from './metafieldDefinitions-graphql';
import { MetafieldDefinitionSyncTableSchema } from '../schemas/syncTable/MetafieldDefinitionSchema';

import type {
  GetMetafieldDefinitionsQuery,
  GetMetafieldDefinitionsQueryVariables,
  GetSingleMetafieldDefinitionQuery,
  GetSingleMetafieldDefinitionQueryVariables,
  MetafieldDefinitionFragment,
} from '../types/admin.generated';
import type { FetchRequestOptions } from '../types/Requests';

// #endregion

// #region Autocomplete functions
function makeAutocompleteMetafieldNameKeysWithDefinitions(ownerType: MetafieldOwnerType) {
  return async function (context: coda.ExecutionContext, search: string, args: any) {
    const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl({ ownerType }, context);
    const searchObjects = metafieldDefinitions.map((metafield) => {
      return {
        name: metafield.name,
        fullKey: getMetaFieldFullKey(metafield),
      };
    });
    return coda.autocompleteSearchObjects(search, searchObjects, 'name', 'fullKey');
  };
}

export function makeAutocompleteMetafieldKeysWithDefinitions(ownerType: MetafieldOwnerType) {
  return async function (context: coda.ExecutionContext, search: string, args: any) {
    const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(
      { ownerType, includeFakeExtraDefinitions: true },
      context
    );
    const keys = metafieldDefinitions.map(getMetaFieldFullKey);
    return coda.simpleAutocomplete(search, keys);
  };
}
// #endregion

// #region Helpers
export function findMatchingMetafieldDefinition(fullKey: string, metafieldDefinitions: MetafieldDefinitionFragment[]) {
  return metafieldDefinitions.find((f) => f && getMetaFieldFullKey(f) === fullKey);
}
export function requireMatchingMetafieldDefinition(
  fullKey: string,
  metafieldDefinitions: MetafieldDefinitionFragment[]
) {
  const metafieldDefinition = findMatchingMetafieldDefinition(fullKey, metafieldDefinitions);
  if (!metafieldDefinition) throw new Error('MetafieldDefinition not found');
  return metafieldDefinition;
}
// #endregion

// #region Format for Schema
/**
 * Format a metafield for Metafield Sync Table Schema
 */
export function formatMetafieldDefinitionForSchemaFromGraphQlApi(
  metafieldDefinitionNode: MetafieldDefinitionFragment,
  context: coda.ExecutionContext
) {
  const graphQlResourceType = getGraphQlResourceFromMetafieldOwnerType(metafieldDefinitionNode.ownerType);

  const definitionId = graphQlGidToId(metafieldDefinitionNode.id);
  let obj: coda.SchemaType<typeof MetafieldDefinitionSyncTableSchema> = {
    ...metafieldDefinitionNode,
    admin_graphql_api_id: metafieldDefinitionNode.id,
    id: definitionId,
    admin_url: `${
      context.endpoint
    }/admin/settings/custom_data/${metafieldDefinitionNode.ownerType.toLowerCase()}/metafields/${definitionId}`,
    ownerType: graphQlResourceType,
    type: metafieldDefinitionNode.type?.name,
  };

  return obj;
}
// #endregion

// #region Format for API

// #endregion

// #region GraphQL Requests
export async function fetchMetafieldDefinitionsGraphQl(
  params: {
    ownerType: MetafieldOwnerType;
    includeFakeExtraDefinitions?: boolean;
  },
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<MetafieldDefinitionFragment[]> {
  const { ownerType } = params;
  let { includeFakeExtraDefinitions } = params;
  if (params.includeFakeExtraDefinitions === undefined) {
    includeFakeExtraDefinitions = true;
  }
  const maxEntriesPerRun = 200;
  const payload = {
    query: queryMetafieldDefinitions,
    variables: {
      ownerType,
      maxEntriesPerRun,
    } as GetMetafieldDefinitionsQueryVariables,
  };

  /* Add 'Fake' metafield definitions for SEO metafields */
  const extraDefinitions: MetafieldDefinitionFragment[] = [];
  if (
    includeFakeExtraDefinitions &&
    [
      MetafieldOwnerType.Page,
      MetafieldOwnerType.Product,
      MetafieldOwnerType.Collection,
      MetafieldOwnerType.Blog,
      MetafieldOwnerType.Article,
    ].includes(ownerType)
  ) {
    extraDefinitions.push({
      id: 'FAKE_SEO_DESCRIPTION_ID',
      name: 'SEO Description',
      namespace: 'global',
      key: 'description_tag',
      type: {
        name: METAFIELD_TYPES.single_line_text_field,
      },
      description: 'The meta description.',
      validations: [],
      metafieldsCount: 0,
      ownerType: ownerType,
      validationStatus: MetafieldDefinitionValidationStatus.AllValid,
      visibleToStorefrontApi: true,
    });
    extraDefinitions.push({
      id: 'FAKE_SEO_TITLE_ID',
      name: 'SEO Title',
      namespace: 'global',
      key: 'title_tag',
      type: {
        name: METAFIELD_TYPES.single_line_text_field,
      },
      description: 'The meta title.',
      validations: [],
      metafieldsCount: 0,
      ownerType: ownerType,
      validationStatus: MetafieldDefinitionValidationStatus.AllValid,
      visibleToStorefrontApi: true,
    });
  }

  const { response } = await makeGraphQlRequest<GetMetafieldDefinitionsQuery>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  return response.body.data.metafieldDefinitions.nodes.concat(extraDefinitions);
}

/**
 * Get a single Metafield Definition from a specific resource type and return the node
 */
export async function fetchSingleMetafieldDefinitionGraphQl(
  metafieldDefinitionGid: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<MetafieldDefinitionFragment> {
  const payload = {
    query: QuerySingleMetafieldDefinition,
    variables: {
      id: metafieldDefinitionGid,
    } as GetSingleMetafieldDefinitionQueryVariables,
  };

  const { response } = await makeGraphQlRequest<GetSingleMetafieldDefinitionQuery>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  if (response?.body?.data.metafieldDefinition) {
    return response.body.data.metafieldDefinition;
  }
}

// #endregion

// #region Unused stuff

// #endregion
