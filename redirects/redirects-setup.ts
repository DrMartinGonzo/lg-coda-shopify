// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  formatRedirectForSchemaFromRestApi,
  fetchSingleRedirectRest,
  deleteRedirect,
  createRedirectRest,
  handleRedirectUpdateJob,
} from './redirects-functions';

import { RedirectSyncTableSchema, redirectFieldDependencies } from '../schemas/syncTable/RedirectSchema';
import { CACHE_DEFAULT, IDENTITY_REDIRECT, REST_DEFAULT_API_VERSION, REST_DEFAULT_LIMIT } from '../constants';
import { SyncTableRestContinuation } from '../types/tableSync';
import { handleFieldDependencies } from '../helpers';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { RedirectCreateRestParams, RedirectSyncRestParams } from '../types/Redirect';

// #endregion

const parameters = {
  redirectID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'redirectId',
    description: 'The ID of the redirect.',
  }),
  path: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'path',
    description:
      'The old path to be redirected. When the user visits this path, they will be redirected to the target. (maximum: 1024 characters).',
  }),
  target: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'target',
    description:
      "The target location where the user will be redirected. When the user visits the old path specified by the path property, they will be redirected to this location. This property can be set to any path on the shop's site, or to an external URL. (maximum: 255 characters)",
  }),
};

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
      { ...parameters.path, optional: true, description: 'Show redirects with a given path.' },
      { ...parameters.target, optional: true, description: 'Show redirects with a given target.' },
    ],
    execute: async function ([path, target], context: coda.SyncExecutionContext) {
      // If executing from CLI, schema is undefined, we have to retrieve it first
      const schema = RedirectSyncTableSchema;
      const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
      const standardFromKeys = coda.getEffectivePropertyKeysFromSchema(schema);

      let restItems = [];
      let restContinuation: SyncTableRestContinuation = null;

      const syncedStandardFields = handleFieldDependencies(standardFromKeys, redirectFieldDependencies);
      const restParams = cleanQueryParams({
        fields: syncedStandardFields.join(', '),
        limit: REST_DEFAULT_LIMIT,
        path,
        target,
      } as RedirectSyncRestParams);

      let url: string;
      if (prevContinuation?.nextUrl) {
        url = coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit });
      } else {
        url = coda.withQueryParams(
          `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/redirects.json`,
          restParams
        );
      }
      const { response, continuation } = await makeSyncTableGetRequest({ url }, context);
      restContinuation = continuation;

      if (response?.body?.redirects) {
        restItems = response.body.redirects.map((redirect) => formatRedirectForSchemaFromRestApi(redirect, context));
      }

      return {
        result: restItems,
        continuation: restContinuation,
      };
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const jobs = updates.map((update) => handleRedirectUpdateJob(update, context));
      const completed = await Promise.allSettled(jobs);
      return {
        result: completed.map((job) => {
          if (job.status === 'fulfilled') return job.value;
          else return job.reason;
        }),
      };
    },
  },
});
// #endregion

// #region Actions
export const Action_UpdateRedirect = coda.makeFormula({
  name: 'UpdateRedirect',
  description: 'Update an existing Shopify redirect and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.redirectID, { ...parameters.path, optional: true }, { ...parameters.target, optional: true }],
  isAction: true,
  resultType: coda.ValueType.Object,
  schema: coda.withIdentity(RedirectSyncTableSchema, IDENTITY_REDIRECT),
  execute: async function ([redirect_id, path, target], context) {
    if (path === undefined && target === undefined) {
      throw new coda.UserVisibleError('Either path or target must be provided');
    }

    // Build a Coda update object for Rest Admin and GraphQL API updates
    let update: coda.SyncUpdate<string, string, any>;

    update = {
      previousValue: { id: redirect_id },
      newValue: { path, target },
      updatedFields: ['path', 'target'],
    };

    return handleRedirectUpdateJob(update, context);
  },
});

export const Action_CreateRedirect = coda.makeFormula({
  name: 'CreateRedirect',
  description: 'Create a new Shopify redirect and return redirect ID.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.path, parameters.target],
  isAction: true,
  resultType: coda.ValueType.String,
  execute: async function ([path, target], context) {
    const params: RedirectCreateRestParams = {
      path,
      target,
    };
    const response = await createRedirectRest(params, context);
    return response.body.redirect.id;
  },
});

export const Action_DeleteRedirect = coda.makeFormula({
  name: 'DeleteRedirect',
  description: 'Delete an existing Shopify redirect and return true on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.redirectID],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([redirectId], context) {
    await deleteRedirect(redirectId, context);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Redirect = coda.makeFormula({
  name: 'Redirect',
  description: 'Return a single redirect from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.redirectID],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: RedirectSyncTableSchema,
  execute: async ([redirect_id], context) => {
    const redirectResponse = await fetchSingleRedirectRest(redirect_id, context);
    if (redirectResponse.body?.redirect) {
      return formatRedirectForSchemaFromRestApi(redirectResponse.body.redirect, context);
    }
  },
});

export const Format_Redirect: coda.Format = {
  name: 'Redirect',
  instructions: 'Paste the redirect ID into the column.',
  formulaName: 'Redirect',
};
// #endregion
