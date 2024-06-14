// #region Imports
import * as coda from '@codahq/packs-sdk';

import { RedirectClient } from '../../Clients/RestClients';
import { PACK_IDENTITIES } from '../../constants';
import { RedirectModel } from '../../models/rest/RedirectModel';
import { RedirectSyncTableSchema } from '../../schemas/syncTable/RedirectSchema';
import { SyncedRedirects } from '../../sync/rest/SyncedRedirects';
import { makeDeleteRestResourceAction, makeFetchSingleRestResourceAction } from '../utils/coda-utils';
import { filters, inputs } from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedRedirects(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedRedirects({
    context,
    codaSyncParams,
    model: RedirectModel,
    client: RedirectClient.createInstance(context),
  });
}

function validateCreateUpdateParams({ path, target }: { path?: string; target?: string }) {
  if (path === undefined && target === undefined) {
    throw new coda.UserVisibleError('Either path or target must be provided');
  }
}

// #endregion

// #region Sync Tables
export const Sync_Redirects = coda.makeSyncTable({
  name: 'Redirects',
  description: 'Return Redirects from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Redirect,
  schema: SyncedRedirects.staticSchema,
  formula: {
    name: 'SyncRedirects',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link SyncedRedirects.codaParamsMap}
     */
    parameters: [
      { ...filters.redirect.path, optional: true },
      { ...filters.redirect.target, optional: true },
    ],
    execute: async (codaSyncParams, context) => createSyncedRedirects(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedRedirects(codaSyncParams, context).executeSyncUpdate(updates),
  },
});
// #endregion

// #region Actions
export const Action_UpdateRedirect = coda.makeFormula({
  name: 'UpdateRedirect',
  description: 'Update an existing Shopify redirect and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.redirect.id,
    { ...inputs.redirect.path, optional: true },
    { ...inputs.redirect.target, optional: true },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  schema: coda.withIdentity(RedirectSyncTableSchema, PACK_IDENTITIES.Redirect),
  execute: async function ([redirect_id, path, target], context) {
    validateCreateUpdateParams({ path, target });
    const redirect = RedirectModel.createInstanceFromRow(context, {
      id: redirect_id,
      path,
      target,
    });
    await redirect.save();
    return redirect.toCodaRow();
  },
});

export const Action_CreateRedirect = coda.makeFormula({
  name: 'CreateRedirect',
  description: 'Create a new Shopify redirect and return its ID.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.redirect.path, inputs.redirect.target],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function ([path, target], context) {
    validateCreateUpdateParams({ path, target });
    const redirect = RedirectModel.createInstanceFromRow(context, {
      id: undefined,
      path,
      target,
    });
    await redirect.save();
    return redirect.data.id;
  },
});

export const Action_DeleteRedirect = makeDeleteRestResourceAction({
  modelName: RedirectModel.displayName,
  IdParameter: inputs.redirect.id,
  execute: async ([itemId], context) => {
    await RedirectClient.createInstance(context).delete({ id: itemId as number });
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Redirect = makeFetchSingleRestResourceAction({
  modelName: RedirectModel.displayName,
  IdParameter: inputs.redirect.id,
  schema: SyncedRedirects.staticSchema,
  execute: async ([itemId], context) => {
    const response = await RedirectClient.createInstance(context).single({ id: itemId as number });
    return RedirectModel.createInstance(context, response.body).toCodaRow();
  },
});

export const Format_Redirect: coda.Format = {
  name: 'Redirect',
  instructions: 'Paste the redirect ID into the column.',
  formulaName: 'Redirect',
};
// #endregion
