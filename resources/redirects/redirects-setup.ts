// #region Imports
import * as coda from '@codahq/packs-sdk';

import { RedirectRestFetcher, RedirectSyncTable } from './redirects-functions';

import { RedirectSyncTableSchema } from '../../schemas/syncTable/RedirectSchema';
import { CACHE_DEFAULT } from '../../constants';
import { inputs, filters } from '../../shared-parameters';
import { Identity } from '../../constants';

import type { Redirect } from '../../types/Resources/Redirect';

// #endregion

// #region Sync Tables
export const Sync_Redirects = coda.makeSyncTable({
  name: 'Redirects',
  description: 'Return Redirects from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Redirect,
  schema: RedirectSyncTableSchema,
  formula: {
    name: 'SyncRedirects',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      { ...filters.redirect.path, optional: true },
      { ...filters.redirect.target, optional: true },
    ],
    execute: async function (params, context: coda.SyncExecutionContext) {
      const redirectSyncTable = new RedirectSyncTable(new RedirectRestFetcher(context), params);
      return redirectSyncTable.executeSync(RedirectSyncTableSchema);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const redirectSyncTable = new RedirectSyncTable(new RedirectRestFetcher(context), params);
      return redirectSyncTable.executeUpdate(updates);
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
  schema: coda.withIdentity(RedirectSyncTableSchema, Identity.Redirect),
  execute: async function ([redirect_id, path, target], context) {
    if (path === undefined && target === undefined) {
      throw new coda.UserVisibleError('Either path or target must be provided');
    }

    let row: Redirect.Row = {
      id: redirect_id,
      path,
      target,
    };
    return new RedirectRestFetcher(context).updateWithMetafields({ original: undefined, updated: row });
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
    let newRow: Partial<Redirect.Row> = {
      path,
      target,
    };

    const redirectFetcher = new RedirectRestFetcher(context);
    const restParams = redirectFetcher.formatRowToApi(newRow) as Redirect.Params.Create;
    const response = await redirectFetcher.create(restParams);
    return response?.body?.redirect?.id;
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
    await new RedirectRestFetcher(context).delete(redirectId);
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
  execute: async ([redirect_id], context) => {
    const redirectFetcher = new RedirectRestFetcher(context);
    const redirectResponse = await redirectFetcher.fetch(redirect_id);
    if (redirectResponse.body?.redirect) {
      return redirectFetcher.formatApiToRow(redirectResponse.body.redirect);
    }
  },
});

export const Format_Redirect: coda.Format = {
  name: 'Redirect',
  instructions: 'Paste the redirect ID into the column.',
  formulaName: 'Redirect',
};
// #endregion
