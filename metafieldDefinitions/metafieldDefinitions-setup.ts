// #region Imports
import * as coda from '@codahq/packs-sdk';

import { MetafieldDefinitionSyncTableSchema } from '../schemas/syncTable/MetafieldDefinitionSchema';
import { getRestResourceFromGraphQlResourceType } from '../helpers-rest';
import { SupportedGraphQlResourceWithMetafields } from '../types/Metafields';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS } from '../metafields/metafields-constants';
import { requireResourceMetafieldsSyncTableDefinition } from '../metafields/metafields-functions';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  idToGraphQlGid,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { queryMetafieldDefinitions } from './metafieldDefinitions-graphql';
import { GetMetafieldDefinitionsQueryVariables, MetafieldDefinitionFragment } from '../types/admin.generated';
import {
  fetchSingleMetafieldDefinitionGraphQl,
  formatMetafieldDefinitionForSchemaFromGraphQlApi,
} from './metafieldDefinitions-functions';
import { CACHE_DEFAULT, IDENTITY_METAFIELD_DEFINITION } from '../constants';
import { inputs } from '../shared-parameters';

// #endregion

// #region Sync tables
export const Sync_MetafieldDefinitions = coda.makeDynamicSyncTable({
  name: 'MetafieldDefinitions',
  description: 'Return Metafield Definitions from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_METAFIELD_DEFINITION,
  listDynamicUrls: async function (context, docUrl: String) {
    return RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS.filter((v) => v.supportMetafieldDefinitions).map((v) => ({
      display: v.display,
      value: v.key,
      hasChildren: false,
    }));
  },
  getName: async function (context) {
    const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
    const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
    return `MetafieldDefinitions_${resourceMetafieldsSyncTableDefinition.display}`;
  },
  /* Direct access to the metafield definition settings page for the resource */
  getDisplayUrl: async function (context) {
    const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
    const restResource = getRestResourceFromGraphQlResourceType(graphQlResource);
    const metafieldDefinitionsUrlPart = restResource.singular;
    return `${context.endpoint}/admin/settings/custom_data/${metafieldDefinitionsUrlPart}/metafields`;
  },
  getSchema: async (context, _, formulaContext) => MetafieldDefinitionSyncTableSchema,
  defaultAddDynamicColumns: false,
  formula: {
    name: 'SyncMetafieldDefinitions',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [],
    execute: async function ([], context) {
      const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
      const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
      const defaultMaxEntriesPerRun = 200;
      const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
        defaultMaxEntriesPerRun,
        prevContinuation,
        context
      );
      if (shouldDeferBy > 0) {
        return skipGraphQlSyncTableRun(prevContinuation as unknown as SyncTableGraphQlContinuation, shouldDeferBy);
      }

      const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
      const payload = {
        query: queryMetafieldDefinitions,
        variables: {
          ownerType: resourceMetafieldsSyncTableDefinition.metafieldOwnerType,
          maxEntriesPerRun,
          cursor: prevContinuation?.cursor ?? null,
        } as GetMetafieldDefinitionsQueryVariables,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.metafieldDefinitions?.pageInfo,
        },
        context
      );

      let items: any[];
      if (response?.body?.data?.metafieldDefinitions?.nodes) {
        items = response.body.data.metafieldDefinitions.nodes.map((node: MetafieldDefinitionFragment) =>
          formatMetafieldDefinitionForSchemaFromGraphQlApi(node, context)
        );
      }

      return {
        result: items,
        continuation: continuation,
      };
    },
  },
});
// #endregion

// #region Actions

// #endregion

// #region Formulas
export const Formula_MetafieldDefinition = coda.makeFormula({
  name: 'MetafieldDefinition',
  description: 'Get a single metafield definition by its ID.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.metafieldDefinition.id],
  resultType: coda.ValueType.Object,
  schema: MetafieldDefinitionSyncTableSchema,
  cacheTtlSecs: CACHE_DEFAULT,
  execute: async function ([metafieldDefinitionID], context) {
    const metafieldDefinitionNode = await fetchSingleMetafieldDefinitionGraphQl(
      idToGraphQlGid(GraphQlResource.MetafieldDefinition, metafieldDefinitionID),
      context
    );

    if (metafieldDefinitionNode) {
      return formatMetafieldDefinitionForSchemaFromGraphQlApi(metafieldDefinitionNode, context);
    }
  },
});

export const Format_MetafieldDefinition: coda.Format = {
  name: 'MetafieldDefinition',
  instructions: 'Paste the ID of the metafield definition into the column.',
  formulaName: 'MetafieldDefinition',
};

// #endregion
