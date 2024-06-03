// #region Imports
import * as coda from '@codahq/packs-sdk';

import { TranslatableContent } from '../../Resources/GraphQl/TranslatableContent';
import { Translation } from '../../Resources/GraphQl/Translation';
import { PACK_IDENTITIES } from '../../constants';
import { TranslatableContentSyncTableSchema } from '../../schemas/syncTable/TranslatableContentSchema';
import { TranslationSyncTableSchema } from '../../schemas/syncTable/TranslationSchema';
import { TranslatableResourceType } from '../../types/admin.types';
import { inputs } from '../coda-parameters';

// #endregion

// #region Sync Tables
export const Sync_Translations = coda.makeSyncTable({
  name: 'Translations',
  description: 'Return Translations from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Translation,
  schema: TranslationSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return Translation.getDynamicSchema({ context, codaSyncParams: [formulaContext.resourceType] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncTranslations',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link Translation.getDynamicSchema}
     *  - {@link Translation.makeSyncTableManagerSyncFunction}
     */
    parameters: [inputs.translation.locale, inputs.translation.resourceType],
    execute: async function (params, context) {
      return Translation.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return Translation.syncUpdate(params, updates, context);
    },
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
  schema: TranslationSyncTableSchema,
  execute: async function ([resourceType, resourceId, locale, key, value], context) {
    const resourceGid = Translation.translatableResourceTypeToGid(resourceType as TranslatableResourceType, resourceId);
    const fromData: Partial<Translation['apiData']> = {
      resourceGid,
      locale,
      key,
      translatedValue: value,
    };

    const updatedTranslation = new Translation({ context, fromData });
    await updatedTranslation.saveAndUpdate();
    return updatedTranslation.formatToRow();
  },
});

export const Action_DeleteTranslation = coda.makeFormula({
  name: `DeleteTranslation`,
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
    const resourceGid = Translation.translatableResourceTypeToGid(resourceType as TranslatableResourceType, resourceId);
    await Translation.delete({ context, locales: [locale], resourceGid: resourceGid, translationKeys: [key] });
    return true;
  },
});
// #endregion
