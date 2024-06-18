// #region Imports
import * as coda from '@codahq/packs-sdk';

import { TranslatableContentClient, TranslationClient } from '../../Clients/GraphQlClients';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { TranslatableContentModel } from '../../models/graphql/TranslatableContentModel';
import { TranslationModel, TranslationModelData } from '../../models/graphql/TranslationModel';
import { SyncedTranslatableContents } from '../../sync/graphql/SyncedTranslatableContents';
import { SyncedTranslations } from '../../sync/graphql/SyncedTranslations';
import { TranslatableResourceType } from '../../types/admin.types';
import { inputs } from '../utils/coda-parameters';

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

function createSyncedTranslatableContents(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext
) {
  return new SyncedTranslatableContents({
    context,
    codaSyncParams,
    model: TranslatableContentModel,
    client: TranslatableContentClient.createInstance(context),
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
    parameters: [inputs.translation.locale, inputs.translation.resourceType],
    execute: async (codaSyncParams, context) => createSyncedTranslations(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    // TODO: implement updating multiple rows in one call
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedTranslations(codaSyncParams, context).executeSyncUpdate(updates),
  },
});

export const Sync_TranslatableContents = coda.makeSyncTable({
  name: 'TranslatableContents',
  description: 'Return TranslatableContent from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.TranslatableContent,
  schema: SyncedTranslatableContents.staticSchema,
  dynamicOptions: {
    getSchema: async (context, _, formulaContext) =>
      SyncedTranslatableContents.getDynamicSchema({ context, codaSyncParams: [] }),
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncTranslatableContents',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedTranslatableContents.codaParamsMap}
     */
    parameters: [inputs.translation.resourceType],
    execute: async (codaSyncParams, context) => createSyncedTranslatableContents(codaSyncParams, context).executeSync(),
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
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(TranslationSyncTableSchema, PACK_IDENTITIES.Translation),
  schema: SyncedTranslations.staticSchema,
  execute: async function ([resourceType, resourceId, locale, key, value], context) {
    const resourceGid = TranslationModel.translatableResourceTypeToGid(
      resourceType as TranslatableResourceType,
      resourceId
    );
    const translation = TranslationModel.createInstance(context, {
      resourceGid,
      locale,
      key,
      translatedValue: value,
    } as Partial<TranslationModelData>);

    await translation.save();
    return translation.toCodaRow();
  },
});

export const Action_DeleteTranslation = coda.makeFormula({
  name: 'DeleteTranslation',
  description: `Delete an existing Shopify Translation and return \`true\` on success.`,
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.translation.resourceType,
    inputs.translation.resourceId,
    inputs.translation.locale,
    inputs.translation.key,
  ],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async ([resourceType, resourceId, locale, key], context) => {
    const resourceGid = TranslationModel.translatableResourceTypeToGid(
      resourceType as TranslatableResourceType,
      resourceId
    );
    await TranslationClient.createInstance(context).delete({ resourceGid, key, locale });
    return true;
  },
});
// #endregion
