import * as coda from '@codahq/packs-sdk';

import { IDENTITY_PAGE } from '../constants';
import { syncPages, fetchPage, updatePage, deletePage, createPage } from './pages-functions';

import { PageSchema } from './pages-schema';
import { sharedParameters } from '../shared-parameters';

const parameters = {
  pageGID: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'pageGid',
    description: 'The GraphQL GID of the page.',
  }),

  // Optional input parameters
  inputHandle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'handle',
    description: 'The handle of the page.',
    optional: true,
  }),
  inputPublished: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'published',
    description: 'The visibility status of the page.',
    optional: true,
  }),
  inputPublishedAt: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'publishedAt',
    description: 'The published date and time of the page.',
    optional: true,
  }),
  inputTitle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'The title of the page.',
    optional: true,
  }),
  inputBodyHtml: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'bodyHtml',
    description: 'The html content of the page.',
    optional: true,
  }),
  inputAuthor: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'author',
    description: 'The author of the page.',
    optional: true,
  }),
  inputTemplateSuffix: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'templateSuffix',
    description: 'The template suffix of the page.',
    optional: true,
  }),
};

export const setupPages = (pack: coda.PackDefinitionBuilder) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Pages',
    description: 'Return Pages from this shop.',
    identityName: IDENTITY_PAGE,
    schema: PageSchema,
    formula: {
      name: 'SyncPages',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        { ...sharedParameters.filterCreatedAtMax, optional: true },
        { ...sharedParameters.filterCreatedAtMin, optional: true },
        { ...sharedParameters.filterHandle, optional: true },
        { ...sharedParameters.filterPublishedAtMax, optional: true },
        { ...sharedParameters.filterPublishedAtMin, optional: true },
        { ...sharedParameters.filterPublishedStatus, optional: true },
        { ...sharedParameters.filterSinceId, optional: true },
        { ...sharedParameters.filterTitle, optional: true },
        { ...sharedParameters.filterUpdatedAtMax, optional: true },
        { ...sharedParameters.filterUpdatedAtMin, optional: true },
      ],
      execute: syncPages,
      maxUpdateBatchSize: 10,
      executeUpdate: async function (args, updates, context: coda.SyncExecutionContext) {
        const jobs = updates.map(async (update) => {
          const { updatedFields } = update;
          const pageGid = update.previousValue.admin_graphql_api_id;

          const fields = {};
          updatedFields.forEach((key) => {
            fields[key] = update.newValue[key];
          });
          const newValues = await updatePage(pageGid, fields, context);
          return newValues;
        });

        // Wait for all of the jobs to finish .
        let completed = await Promise.allSettled(jobs);

        return {
          // For each update, return either the updated row
          // or an error if the update failed.
          result: completed.map((job) => {
            if (job.status === 'fulfilled') {
              return job.value;
            } else {
              return job.reason;
            }
          }),
        };
      },
    },
  });

  /**====================================================================================================================
   *    Actions
   *===================================================================================================================== */
  // an action to update a page
  pack.addFormula({
    name: 'UpdatePage',
    description: 'Update an existing Shopify page and return the updated data.',
    parameters: [
      parameters.pageGID,
      // Optional input parameters
      parameters.inputHandle,
      parameters.inputPublished,
      parameters.inputPublishedAt,
      parameters.inputTitle,
      parameters.inputBodyHtml,
      parameters.inputAuthor,
      parameters.inputTemplateSuffix,
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    schema: coda.withIdentity(PageSchema, IDENTITY_PAGE),
    execute: async function (
      [pageGID, handle, published, publishedAt, title, bodyHtml, author, templateSuffix],
      context
    ) {
      return updatePage(
        pageGID,
        {
          handle,
          published: published,
          published_at: publishedAt,
          title,
          bodyHtml,
          author,
          template_suffix: templateSuffix,
        },
        context
      );
    },
  });

  // an action to create a page
  pack.addFormula({
    name: 'CreatePage',
    description: `Create a new Shopify page and return GraphQl GID. The page will be visible unless 'published' is set to false.`,
    parameters: [
      { ...parameters.inputTitle, optional: false },

      // Optional input parameters
      parameters.inputHandle,
      parameters.inputPublished,
      parameters.inputPublishedAt,
      parameters.inputBodyHtml,
      parameters.inputAuthor,
      parameters.inputTemplateSuffix,
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async function ([title, handle, published, publishedAt, bodyHtml, author, templateSuffix], context) {
      const response = await createPage(
        {
          title,
          handle,
          published,
          published_at: publishedAt,
          bodyHtml,
          author,
          template_suffix: templateSuffix,
        },
        context
      );
      const { body } = response;
      return body.page.admin_graphql_api_id;
    },
  });

  // an action to delete a page
  pack.addFormula({
    name: 'DeletePage',
    description: 'Delete an existing Shopify page and return true on success.',
    parameters: [parameters.pageGID],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async function ([pageGID], context) {
      await deletePage([pageGID], context);
      return true;
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Page',
    description: 'Return a single page from this shop.',
    parameters: [parameters.pageGID],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: PageSchema,
    execute: fetchPage,
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'Page',
    instructions: 'Paste the GraphQL GID of the page into the column.',
    formulaName: 'Page',
  });
};
