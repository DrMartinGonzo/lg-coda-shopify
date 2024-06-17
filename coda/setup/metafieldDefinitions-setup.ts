// #region Imports
import * as coda from '@codahq/packs-sdk';

import { MetafieldDefinitionClient } from '../../Clients/GraphQlClients';
import { CACHE_DEFAULT } from '../../constants/cacheDurations-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { MetafieldDefinitionModel } from '../../models/graphql/MetafieldDefinitionModel';
import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { SyncedMetafieldDefinitions } from '../../sync/graphql/SyncedMetafieldDefinitions';
import { inputs } from '../utils/coda-parameters';

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
export const Sync_MetafieldDefinitions = coda.makeSyncTable({
  name: 'MetafieldDefinitions',
  description: 'Return Metafield Definitions from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.MetafieldDefinition,
  schema: SyncedMetafieldDefinitions.staticSchema,
  dynamicOptions: {
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncMetafieldDefinitions',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [inputs.metafieldDefinition.ownerType],
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
