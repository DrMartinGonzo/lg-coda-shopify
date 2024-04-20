// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FromRow } from '../../Resources/Abstract/Rest/AbstractSyncedRestResource';
import { Redirect } from '../../Resources/Rest/Redirect';
import { CACHE_DEFAULT, PACK_IDENTITIES } from '../../constants';
import { RedirectRow } from '../../schemas/CodaRows.types';
import { RedirectSyncTableSchema } from '../../schemas/syncTable/RedirectSchema';
import { filters, inputs } from '../coda-parameters';
import { NotFoundVisibleError } from '../../Errors/Errors';

// #endregion

// #region Sync Tables
export const Sync_Redirects = coda.makeSyncTable({
  name: 'Redirects',
  description: 'Return Redirects from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Redirect,
  schema: RedirectSyncTableSchema,
  formula: {
    name: 'SyncRedirects',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link Redirect.makeSyncTableManagerSyncFunction}
     */
    parameters: [
      { ...filters.redirect.path, optional: true },
      { ...filters.redirect.target, optional: true },
    ],
    execute: async function (params, context) {
      return Redirect.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return Redirect.syncUpdate(params, updates, context);
    },
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
    if (path === undefined && target === undefined) {
      throw new coda.UserVisibleError('Either path or target must be provided');
    }

    const fromRow: FromRow<RedirectRow> = {
      row: {
        id: redirect_id,
        path,
        target,
      },
    };

    const updatedRedirect = new Redirect({ context, fromRow });
    await updatedRedirect.saveAndUpdate();
    return updatedRedirect.formatToRow();
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
    const fromRow: FromRow<RedirectRow> = {
      row: {
        path,
        target,
      },
    };

    const newRedirect = new Redirect({ context, fromRow });
    await newRedirect.saveAndUpdate();
    return newRedirect.apiData.id;
  },
});

export const Action_DeleteRedirect = coda.makeFormula({
  name: 'DeleteRedirect',
  description: 'Delete an existing Shopify redirect and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.redirect.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([redirectId], context) {
    await Redirect.delete({ context, id: redirectId });
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Redirect = coda.makeFormula({
  name: 'Redirect',
  description: 'Return a single redirect from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.redirect.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: RedirectSyncTableSchema,
  execute: async ([redirectId], context) => {
    const redirect = await Redirect.find({ context, id: redirectId });
    if (redirect) {
      return redirect.formatToRow();
    }
    throw new NotFoundVisibleError(PACK_IDENTITIES.Redirect);
  },
});

export const Format_Redirect: coda.Format = {
  name: 'Redirect',
  instructions: 'Paste the redirect ID into the column.',
  formulaName: 'Redirect',
};
// #endregion
