// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import { ResultOf, VariablesOf, readFragment } from '../../utils/graphql';
import * as coda from '@codahq/packs-sdk';

import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { SyncTableGraphQlContinuation } from '../../Fetchers/SyncTable.types';
import { CACHE_DEFAULT, Identity } from '../../constants';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  idToGraphQlGid,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../../helpers-graphql';
import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { inputs } from '../../shared-parameters';
import { MetafieldOwnerType } from '../../types/admin.types';
import { getResourcesWithMetaFieldDefinitions, requireResourceWithMetaFieldsByOwnerType } from '../resources';
import {
  fetchSingleMetafieldDefinitionGraphQl,
  formatMetafieldDefinitionForSchemaFromGraphQlApi,
} from './metafieldDefinitions-functions';
import { MetafieldDefinitionFragment, queryMetafieldDefinitions } from './metafieldDefinitions-graphql';

// #endregion

// #region Sync tables
export const Sync_MetafieldDefinitions = coda.makeDynamicSyncTable({
  name: 'MetafieldDefinitions',
  description: 'Return Metafield Definitions from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.MetafieldDefinition,
  listDynamicUrls: async function (context, docUrl: String) {
    return getResourcesWithMetaFieldDefinitions().map((v) => ({
      display: v.display,
      value: v.metafields.ownerType,
      hasChildren: false,
    }));
  },
  getName: async function (context) {
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const ownerResource = requireResourceWithMetaFieldsByOwnerType(metafieldOwnerType);
    return `${ownerResource.display} MetafieldDefinitions`;
  },
  /* Direct access to the metafield definition settings page for the resource */
  getDisplayUrl: async function (context) {
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const ownerResource = requireResourceWithMetaFieldsByOwnerType(metafieldOwnerType);
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
      const ownerResource = requireResourceWithMetaFieldsByOwnerType(metafieldOwnerType);
      const payload = {
        query: printGql(queryMetafieldDefinitions),
        variables: {
          ownerType: ownerResource.metafields.ownerType,
          maxEntriesPerRun,
          cursor: prevContinuation?.cursor ?? null,
        } as VariablesOf<typeof queryMetafieldDefinitions>,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest<ResultOf<typeof queryMetafieldDefinitions>>(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.metafieldDefinitions?.pageInfo,
        },
        context
      );

      const metafieldDefinitions =
        readFragment(MetafieldDefinitionFragment, response?.body?.data?.metafieldDefinitions?.nodes) ?? [];
      const items = metafieldDefinitions.map((node) => formatMetafieldDefinitionForSchemaFromGraphQlApi(node, context));

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
