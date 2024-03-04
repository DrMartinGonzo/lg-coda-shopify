// #region Imports
import * as coda from '@codahq/packs-sdk';

import { RedirectRestFetcher } from './redirects-functions';

import { RedirectSyncTableSchema, redirectFieldDependencies } from '../schemas/syncTable/RedirectSchema';
import { CACHE_DEFAULT, IDENTITY_REDIRECT, REST_DEFAULT_LIMIT } from '../constants';
import { handleFieldDependencies } from '../helpers';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { inputs, filters } from '../shared-parameters';

import type { Redirect as RedirectRest } from '@shopify/shopify-api/rest/admin/2023-10/redirect';
import type { RedirectRow } from '../types/CodaRows';
import type { RedirectCreateRestParams, RedirectSyncRestParams } from '../types/Redirect';
import type { SyncTableRestContinuation } from '../types/tableSync';

// #endregion

// #region Sync Tables
export const Sync_Redirects = coda.makeSyncTable({
  name: 'Redirects',
  description: 'Return Redirects from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_REDIRECT,
  schema: RedirectSyncTableSchema,
  formula: {
    name: 'SyncRedirects',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      { ...filters.redirect.path, optional: true },
      { ...filters.redirect.target, optional: true },
    ],
    execute: async function ([path, target], context: coda.SyncExecutionContext) {
      // If executing from CLI, schema is undefined, we have to retrieve it first
      const schema = RedirectSyncTableSchema;
      const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
      const standardFromKeys = coda.getEffectivePropertyKeysFromSchema(schema);

      const syncedStandardFields = handleFieldDependencies(standardFromKeys, redirectFieldDependencies);
      const restParams = cleanQueryParams({
        fields: syncedStandardFields.join(', '),
        limit: REST_DEFAULT_LIMIT,
        path,
        target,
      } as RedirectSyncRestParams);
      const redirectFetcher = new RedirectRestFetcher(context);
      redirectFetcher.validateParams(restParams);

      const url = prevContinuation?.nextUrl ?? redirectFetcher.getFetchAllUrl(restParams);
      const { response, continuation } = await makeSyncTableGetRequest<{ redirects: RedirectRest[] }>({ url }, context);

      return {
        result: response?.body?.redirects ? response.body.redirects.map(redirectFetcher.formatApiToRow) : [],
        continuation,
      };
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return new RedirectRestFetcher(context).executeSyncTableUpdate(updates);
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
  schema: coda.withIdentity(RedirectSyncTableSchema, IDENTITY_REDIRECT),
  execute: async function ([redirect_id, path, target], context) {
    if (path === undefined && target === undefined) {
      throw new coda.UserVisibleError('Either path or target must be provided');
    }

    let row: RedirectRow = {
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
    let newRow: Partial<RedirectRow> = {
      path,
      target,
    };

    const redirectFetcher = new RedirectRestFetcher(context);
    const restParams = redirectFetcher.formatRowToApi(newRow) as RedirectCreateRestParams;
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
