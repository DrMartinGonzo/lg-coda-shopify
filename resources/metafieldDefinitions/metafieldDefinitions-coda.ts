// #region Imports
import * as coda from '@codahq/packs-sdk';

import { GraphQlResourceName } from '../ShopifyResource.types';
import { CACHE_DEFAULT, Identity } from '../../constants';
import { idToGraphQlGid } from '../../helpers-graphql';
import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { inputs } from '../../shared-parameters';
import { MetafieldOwnerType } from '../../types/admin.types';
import { getResourcesWithMetaFieldDefinitions, requireResourceWithMetaFieldsByOwnerType } from '../resources';
import { MetafieldDefinitionGraphQlFetcher } from './MetafieldDefinitionGraphQlFetcher';
import { MetafieldDefinitionSyncTable } from './MetafieldDefinitionSyncTable';
import {
  fetchSingleMetafieldDefinitionGraphQl,
  formatMetafieldDefinitionForSchemaFromGraphQlApi,
} from './metafieldDefinitions-functions';
import { resolveSchemaFromContext } from '../../schemas/schema-helpers';
import { transformToArraySchema } from '../../utils/helpers';

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
    execute: async function (params, context) {
      const schema = context.sync.schema ?? transformToArraySchema(MetafieldDefinitionSyncTableSchema);
      const metafieldDefinitionFetcher = new MetafieldDefinitionGraphQlFetcher(context);
      const metafieldDefinitionSyncTable = new MetafieldDefinitionSyncTable(metafieldDefinitionFetcher, schema, params);
      return metafieldDefinitionSyncTable.executeSync();
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
