// #region Imports
import * as coda from '@codahq/packs-sdk';

import { MetafieldDefinitionClient } from '../../Clients/GraphQlApiClientBase';
import {
  SupportedMetafieldSyncTable,
  getAllSupportedMetafieldSyncTables,
} from '../../Resources/Mixed/SupportedMetafieldSyncTable';
import { GraphQlResourceNames } from '../../Resources/types/SupportedResource';
import { CACHE_DEFAULT, PACK_IDENTITIES } from '../../constants';
import { MetafieldDefinitionModel } from '../../models/graphql/MetafieldDefinitionModel';
import { SupportedMetafieldOwnerType } from '../../models/graphql/MetafieldGraphQlModel';
import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { SyncedMetafieldDefinitions } from '../../sync/graphql/SyncedMetafieldDefinitions';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { compareByDisplayKey } from '../../utils/helpers';
import { inputs } from '../coda-parameters';

// #endregion

// #region Helper functions
function createSyncedMetafieldDefinitions(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext
) {
  return new SyncedMetafieldDefinitions({
    context,
    codaSyncParams,
    model: MetafieldDefinitionModel,
    client: MetafieldDefinitionClient.createInstance(context),
  });
}
// #endregion

// #region Sync tables
export const Sync_MetafieldDefinitions = coda.makeDynamicSyncTable({
  name: 'MetafieldDefinitions',
  description: 'Return Metafield Definitions from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.MetafieldDefinition,
  listDynamicUrls: async (context) =>
    getAllSupportedMetafieldSyncTables()
      .map((r) => ({
        display: r.display,
        value: r.ownerType,
      }))
      .sort(compareByDisplayKey)
      .map((r) => ({ ...r, hasChildren: false })),
  getName: async function (context) {
    const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
    const supportedSyncTable = new SupportedMetafieldSyncTable(metafieldOwnerType);
    return `${supportedSyncTable.display} MetafieldDefinitions`;
  },
  getDisplayUrl: async function (context) {
    const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
    const supportedSyncTable = new SupportedMetafieldSyncTable(metafieldOwnerType);
    return supportedSyncTable.getAdminUrl(context);
  },
  getSchema: async () => SyncedMetafieldDefinitions.getDynamicSchema(),
  defaultAddDynamicColumns: false,
  formula: {
    name: 'SyncMetafieldDefinitions',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [],
    execute: async (codaSyncParams, context) => createSyncedMetafieldDefinitions(codaSyncParams, context).executeSync(),
  },
});
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
    const response = await MetafieldDefinitionClient.createInstance(context).single({
      id: idToGraphQlGid(GraphQlResourceNames.MetafieldDefinition, metafieldDefinitionID),
    });
    return MetafieldDefinitionModel.createInstance(context, response.body).toCodaRow();
  },
});

export const Format_MetafieldDefinition: coda.Format = {
  name: 'MetafieldDefinition',
  instructions: 'Paste the ID of the metafield definition into the column.',
  formulaName: 'MetafieldDefinition',
};

// #endregion
