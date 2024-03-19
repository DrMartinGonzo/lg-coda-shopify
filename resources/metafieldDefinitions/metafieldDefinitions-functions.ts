// #region Imports
import * as coda from '@codahq/packs-sdk';
import { print as printGql } from '@0no-co/graphql.web';
import { ResultOf, VariablesOf, FragmentOf, readFragment } from '../../utils/graphql';

import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { CACHE_DEFAULT } from '../../constants';
import { graphQlGidToId, makeGraphQlRequest } from '../../helpers-graphql';
import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { MetafieldDefinitionValidationStatus, MetafieldOwnerType } from '../../types/admin.types';
import { METAFIELD_TYPES } from '../metafields/metafields-constants';
import { getMetaFieldFullKey } from '../metafields/metafields-helpers';
import {
  MetafieldDefinitionFragment,
  QuerySingleMetafieldDefinition,
  queryMetafieldDefinitions,
} from './metafieldDefinitions-graphql';

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

// #endregion

// #region Helpers
export function findMatchingMetafieldDefinition(
  fullKey: string,
  metafieldDefinitions: Array<ResultOf<typeof MetafieldDefinitionFragment>>
) {
  return metafieldDefinitions.find((f) => f && getMetaFieldFullKey(f) === fullKey);
}
export function requireMatchingMetafieldDefinition(
  fullKey: string,
  metafieldDefinitions: Array<ResultOf<typeof MetafieldDefinitionFragment>>
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
  metafieldDefinitionNode: ResultOf<typeof MetafieldDefinitionFragment>,
  context: coda.ExecutionContext
) {
  const definitionId = graphQlGidToId(metafieldDefinitionNode.id);
  let obj: coda.SchemaType<typeof MetafieldDefinitionSyncTableSchema> = {
    ...metafieldDefinitionNode,
    admin_graphql_api_id: metafieldDefinitionNode.id,
    id: definitionId,
    admin_url: `${
      context.endpoint
    }/admin/settings/custom_data/${metafieldDefinitionNode.ownerType.toLowerCase()}/metafields/${definitionId}`,
    ownerType: metafieldDefinitionNode.ownerType,
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
): Promise<Array<ResultOf<typeof MetafieldDefinitionFragment>>> {
  const { ownerType } = params;
  let { includeFakeExtraDefinitions } = params;
  if (params.includeFakeExtraDefinitions === undefined) {
    includeFakeExtraDefinitions = true;
  }
  const maxEntriesPerRun = 200;
  const payload = {
    query: printGql(queryMetafieldDefinitions),
    variables: {
      ownerType,
      maxEntriesPerRun,
    } as VariablesOf<typeof queryMetafieldDefinitions>,
  };

  /* Add 'Fake' metafield definitions for SEO metafields */
  const extraDefinitions: Array<ResultOf<typeof MetafieldDefinitionFragment>> = [];
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
      pinnedPosition: 1000,
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
      pinnedPosition: 1001,
      ownerType: ownerType,
      validationStatus: MetafieldDefinitionValidationStatus.AllValid,
      visibleToStorefrontApi: true,
    });
  }

  const { response } = await makeGraphQlRequest<ResultOf<typeof queryMetafieldDefinitions>>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );

  const metafieldDefinitions =
    readFragment(MetafieldDefinitionFragment, response?.body?.data?.metafieldDefinitions?.nodes) ?? [];
  return metafieldDefinitions.concat(extraDefinitions);
}

/**
 * Get a single Metafield Definition from a specific resource type and return the node
 */
export async function fetchSingleMetafieldDefinitionGraphQl(
  metafieldDefinitionGid: string,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<ResultOf<typeof MetafieldDefinitionFragment>> {
  const payload = {
    query: printGql(QuerySingleMetafieldDefinition),
    variables: {
      id: metafieldDefinitionGid,
    } as VariablesOf<typeof QuerySingleMetafieldDefinition>,
  };

  const { response } = await makeGraphQlRequest<ResultOf<typeof QuerySingleMetafieldDefinition>>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  if (response?.body?.data.metafieldDefinition) {
    return readFragment(MetafieldDefinitionFragment, response.body.data.metafieldDefinition);
  }
}

// #endregion

// #region Unused stuff

// #endregion
