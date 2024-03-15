// #region Imports
import * as coda from '@codahq/packs-sdk';

import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { GraphQlResourceName } from '../../types/ShopifyGraphQlResourceTypes';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  idToGraphQlGid,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../helpers-graphql';
import { queryMetafieldDefinitions } from './metafieldDefinitions-graphql';
import {
  fetchSingleMetafieldDefinitionGraphQl,
  formatMetafieldDefinitionForSchemaFromGraphQlApi,
} from './metafieldDefinitions-functions';
import { CACHE_DEFAULT } from '../../constants';
import { inputs } from '../../shared-parameters';
import { Identity } from '../../constants';

import type {
  GetMetafieldDefinitionsQuery,
  GetMetafieldDefinitionsQueryVariables,
  MetafieldDefinitionFragment,
} from '../../types/generated/admin.generated';
import type { SyncTableGraphQlContinuation } from '../../types/SyncTable';
import {
  getResourceDefinitionsWithMetaFieldDefinitionSyncTable,
  requireResourceDefinitionWithMetaFieldOwnerType,
} from '../allResources';
import { MetafieldOwnerType } from '../../types/generated/admin.types';

// #endregion

// #region Sync tables
export const Sync_MetafieldDefinitions = coda.makeDynamicSyncTable({
  name: 'MetafieldDefinitions',
  description: 'Return Metafield Definitions from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.MetafieldDefinition,
  listDynamicUrls: async function (context, docUrl: String) {
    return getResourceDefinitionsWithMetaFieldDefinitionSyncTable().map((v) => ({
      display: v.display,
      value: v.metafieldOwnerType,
      hasChildren: false,
    }));
  },
  getName: async function (context) {
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const ownerResource = requireResourceDefinitionWithMetaFieldOwnerType(metafieldOwnerType);
    return `${ownerResource.display} MetafieldDefinitions`;
  },
  /* Direct access to the metafield definition settings page for the resource */
  getDisplayUrl: async function (context) {
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const ownerResource = requireResourceDefinitionWithMetaFieldOwnerType(metafieldOwnerType);
    const metafieldDefinitionsUrlPart = ownerResource.rest.singular;
    return `${context.endpoint}/admin/settings/custom_data/${metafieldDefinitionsUrlPart}/metafields`;
  },
  getSchema: async (context, _, formulaContext) => MetafieldDefinitionSyncTableSchema,
  defaultAddDynamicColumns: false,
  formula: {
    name: 'SyncMetafieldDefinitions',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [],
    execute: async function ([], context) {
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

      const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
      const ownerResource = requireResourceDefinitionWithMetaFieldOwnerType(metafieldOwnerType);
      const payload = {
        query: queryMetafieldDefinitions,
        variables: {
          ownerType: ownerResource.metafieldOwnerType,
          maxEntriesPerRun,
          cursor: prevContinuation?.cursor ?? null,
        } as GetMetafieldDefinitionsQueryVariables,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest<GetMetafieldDefinitionsQuery>(
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
      idToGraphQlGid(GraphQlResourceName.MetafieldDefinition, metafieldDefinitionID),
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
