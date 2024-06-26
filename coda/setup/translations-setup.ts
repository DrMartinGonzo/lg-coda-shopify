// #region Imports
import * as coda from '@codahq/packs-sdk';

import { TranslationClient } from '../../Clients/GraphQlClients';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { TranslationModel, TranslationModelData } from '../../models/graphql/TranslationModel';
import { SyncedTranslations } from '../../sync/graphql/SyncedTranslations';
import { TranslatableResourceType } from '../../types/admin.types';
import { parseOptionId } from '../../utils/helpers';
import { filters, inputs } from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedTranslations(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext
) {
  return new SyncedTranslations({
    context,
    codaSyncParams,
    model: TranslationModel,
    client: TranslationClient.createInstance(context),
  });
}
// #endregion

// #region Sync Tables
export const Sync_Translations = coda.makeSyncTable({
  name: 'Translations',
  description: 'Return Translations from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Translation,
  schema: SyncedTranslations.staticSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return SyncedTranslations.getDynamicSchema({ context, codaSyncParams: [formulaContext.resourceType] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncTranslations',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedTranslations.codaParamsMap}
     */
    parameters: [
      inputs.translation.locale,
      inputs.translation.resourceType,
      {
        ...filters.market.idOptionName,
        optional: true,
        description: 'The market Id. Use this when you want to retrieve translations specific to a market.',
      },
      { ...inputs.translation.onlyTranslated, optional: true },
      { ...inputs.translation.keys, optional: true },
    ],
    execute: async (codaSyncParams, context) => createSyncedTranslations(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    // TODO: implement updating multiple rows in one call
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedTranslations(codaSyncParams, context).executeSyncUpdate(updates),
  },
});
// #endregion

// #region Actions
export const Action_SetTranslation = coda.makeFormula({
  name: 'SetTranslation',
  description:
    'Set a translation. If the translation does not exist, it will be created. If it exists and you input an empty value, it will be translation. Return the translation data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.translation.resourceType,
    inputs.translation.resourceId,
    inputs.translation.locale,
    inputs.translation.key,
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'value',
      description: 'The translated value in the target locale.',
    }),
    {
      ...filters.market.idOptionName,
      optional: true,
      description: 'The market Id. Use this when you want to set a translation specific to a market.',
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(TranslationSyncTableSchema, PACK_IDENTITIES.Translation),
  schema: SyncedTranslations.staticSchema,
  execute: async function ([resourceType, resourceId, locale, key, value, market], context) {
    const resourceGid = TranslationModel.translatableResourceTypeToGid(
      resourceType as TranslatableResourceType,
      resourceId
    );
    const translation = TranslationModel.createInstance(context, {
      resourceGid,
      locale,
      key,
      translatedValue: value,
      marketId: idToGraphQlGid(GraphQlResourceNames.Market, parseOptionId(market)),
    } as Partial<TranslationModelData>);

    await translation.save();
    return translation.toCodaRow();
  },
});
// #endregion
