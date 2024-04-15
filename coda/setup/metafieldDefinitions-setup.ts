// #region Imports
import * as coda from '@codahq/packs-sdk';

import { MetafieldDefinition } from '../../Resources/GraphQl/MetafieldDefinition';
import { CACHE_DEFAULT, Identity } from '../../constants';
import { idToGraphQlGid } from '../../utils/graphql-utils';
import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { inputs } from '../coda-parameters';
import { GraphQlResourceName } from '../../Resources/types/GraphQlResource.types';

// #endregion

// #region Sync tables
export const Sync_MetafieldDefinitions = coda.makeDynamicSyncTable({
  name: 'MetafieldDefinitions',
  description: 'Return Metafield Definitions from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.MetafieldDefinition,
  listDynamicUrls: MetafieldDefinition.listDynamicSyncTableUrls,
  getName: MetafieldDefinition.getDynamicSyncTableName,
  getDisplayUrl: MetafieldDefinition.getDynamicSyncTableDisplayUrl,
  getSchema: async () => MetafieldDefinition.getDynamicSchema(),
  defaultAddDynamicColumns: false,
  formula: {
    name: 'SyncMetafieldDefinitions',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [],
    execute: async (params, context) => MetafieldDefinition.sync(params, context),
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
    const metafieldDefinition = await MetafieldDefinition.find({
      context,
      id: idToGraphQlGid(GraphQlResourceName.MetafieldDefinition, metafieldDefinitionID),
    });
    return metafieldDefinition.formatToRow();
  },
});

export const Format_MetafieldDefinition: coda.Format = {
  name: 'MetafieldDefinition',
  instructions: 'Paste the ID of the metafield definition into the column.',
  formulaName: 'MetafieldDefinition',
};

// #endregion
