// #region Imports
import * as coda from '@codahq/packs-sdk';

import { IDENTITY_PAGE, METAFIELD_PREFIX_KEY, REST_DEFAULT_API_VERSION, REST_DEFAULT_LIMIT } from '../constants';
import {
  fetchPageRest,
  deletePageRest,
  createPageRest,
  validatePageParams,
  formatPageForSchemaFromRestApi,
  handlePageUpdateJob,
  updatePageRest,
} from './pages-functions';

import { PageSchema, pageFieldDependencies } from '../schemas/syncTable/PageSchema';
import { sharedParameters } from '../shared-parameters';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  formatMetafieldRestInputFromMetafieldKeyValueSet,
  getMetaFieldFullKey,
  handleResourceMetafieldsUpdateRest,
  preprendPrefixToMetaFieldKey,
} from '../metafields/metafields-functions';
import {
  fetchMetafieldDefinitionsGraphQl,
  fetchMetafieldsRest,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { SyncTableRestContinuation } from '../types/tableSync';
import { MetafieldOwnerType, MetafieldDefinition } from '../types/admin.types';
import { arrayUnique, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import type { Metafield as MetafieldRest } from '@shopify/shopify-api/rest/admin/2023-10/metafield';
import { PageCreateRestParams, PageUpdateRestParams } from '../types/Page';
import { getTemplateSuffixesFor, makeAutocompleteTemplateSuffixesFor } from '../themes/themes-functions';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { restResources } from '../types/Rest';
// #endregion

async function getPageSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = PageSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(PageSchema, MetafieldOwnerType.Page, context);
  }
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');

  return augmentedSchema;
}

const parameters = {
  pageID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'pageId',
    description: 'The Id of the page.',
  }),
  // inputHandle: coda.makeParameter({
  //   type: coda.ParameterType.String,
  //   name: 'handle',
  //   description: 'The handle of the page.',
  // }),
  // inputPublished: coda.makeParameter({
  //   type: coda.ParameterType.Boolean,
  //   name: 'published',
  //   description: 'The visibility status of the page.',
  // }),
  // inputPublishedAt: coda.makeParameter({
  //   type: coda.ParameterType.Date,
  //   name: 'publishedAt',
  //   description: 'The published date and time of the page.',
  // }),
  inputTitle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'The title of the page.',
  }),
  templateSuffix: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'templateSuffix',
    autocomplete: makeAutocompleteTemplateSuffixesFor('page'),
    description:
      'The suffix of the Liquid template used for the page. If this property is null, then the page uses the default template.',
  }),
  // inputBodyHtml: coda.makeParameter({
  //   type: coda.ParameterType.String,
  //   name: 'bodyHtml',
  //   description: 'The html content of the page.',
  // }),
  // inputAuthor: coda.makeParameter({
  //   type: coda.ParameterType.String,
  //   name: 'author',
  //   description: 'The author of the page.',
  // }),
  // inputTemplateSuffix: coda.makeParameter({
  //   type: coda.ParameterType.String,
  //   name: 'templateSuffix',
  //   description: 'The template suffix of the page.',
  // }),
};

// #region Sync Tables
export const Sync_Pages = coda.makeSyncTable({
  name: 'Pages',
  description: 'Return Pages from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_PAGE,
  schema: PageSchema,
  dynamicOptions: {
    getSchema: getPageSchema,
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return getTemplateSuffixesFor('page', context);
      }
    },
  },
  formula: {
    name: 'SyncPages',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      {
        ...sharedParameters.optionalSyncMetafields,
        description:
          "description: 'Also retrieve metafields. Not recommanded if you have lots of pages, the sync will be much slower as the pack will have to do another API call for each page. Still waiting for Shopify to add GraphQL access to pages...',",
      },
      { ...sharedParameters.filterCreatedAtRange, optional: true },
      { ...sharedParameters.filterUpdatedAtRange, optional: true },
      { ...sharedParameters.filterPublishedAtRange, optional: true },
      { ...sharedParameters.filterHandle, optional: true },
      { ...sharedParameters.filterPublishedStatus, optional: true },
      { ...sharedParameters.filterSinceId, optional: true },
      { ...sharedParameters.filterTitle, optional: true },
    ],
    execute: async function (
      [syncMetafields, created_at, updated_at, published_at, handle, published_status, since_id, title],
      context
    ) {
      // If executing from CLI, schema is undefined, we have to retrieve it first
      const schema = context.sync.schema ?? (await wrapGetSchemaForCli(getPageSchema, context, { syncMetafields }));
      const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
      const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
        separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

      const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(removePrefixFromMetaFieldKey);
      const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

      let metafieldDefinitions: MetafieldDefinition[] = [];

      if (shouldSyncMetafields) {
        metafieldDefinitions =
          prevContinuation?.extraContinuationData?.metafieldDefinitions ??
          (await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Page }, context));
      }

      const syncedStandardFields = handleFieldDependencies(standardFromKeys, pageFieldDependencies);
      const params = cleanQueryParams({
        fields: syncedStandardFields.join(', '),
        created_at_min: created_at ? created_at[0] : undefined,
        created_at_max: created_at ? created_at[1] : undefined,
        updated_at_min: updated_at ? updated_at[0] : undefined,
        updated_at_max: updated_at ? updated_at[1] : undefined,
        published_at_min: published_at ? published_at[0] : undefined,
        published_at_max: published_at ? published_at[1] : undefined,
        handle,
        // limit number of returned results when syncing metafields to avoid timeout with the subsequent multiple API calls
        // TODO: calculate best possible value based on effectiveMetafieldKeys.length
        limit: shouldSyncMetafields ? 30 : REST_DEFAULT_LIMIT,
        published_status,
        since_id,
        title,
      });

      validatePageParams(params);

      let url =
        prevContinuation?.nextUrl ??
        coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/pages.json`, params);

      let restResult = [];
      let { response, continuation } = await makeSyncTableGetRequest(
        { url, extraContinuationData: { metafieldDefinitions } },
        context
      );
      if (response && response.body?.pages) {
        restResult = response.body.pages.map((page) => formatPageForSchemaFromRestApi(page, context));
      }

      // Add metafields by doing multiple Rest Admin API calls
      if (shouldSyncMetafields) {
        restResult = await Promise.all(
          restResult.map(async (resource) => {
            let obj = { ...resource };

            const response = await fetchMetafieldsRest(resource.id, restResources.Page, {}, context);
            const metafields: MetafieldRest[] = response.body.metafields;

            // TODO: On pourrait peut-être tous les processer et laisser Coda se démerder derrière pour ne pas intégrer ceux qui ne sont pas définis dans le schéma
            // Process metafields that have a definition and in the schema
            const definitionsFullKeys = metafieldDefinitions.map((def) => `${def.namespace}.${def.key}`);
            const metafieldsWithDefinition = metafields.filter(
              (meta: MetafieldRest) =>
                effectiveMetafieldKeys.includes(`${meta.namespace}.${meta.key}`) &&
                definitionsFullKeys.includes(`${meta.namespace}.${meta.key}`)
            );
            if (metafieldsWithDefinition.length) {
              metafieldsWithDefinition.forEach((metafield) => {
                const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
                obj[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
              });
            }

            return obj;
          })
        );
      }

      return { result: restResult, continuation };
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
      const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
      const metafieldDefinitions = hasUpdatedMetaFields
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Page }, context)
        : [];

      const jobs = updates.map((update) => handlePageUpdateJob(update, metafieldDefinitions, context));
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
export const Action_CreatePage = coda.makeFormula({
  name: 'CreatePage',
  description: `Create a new Shopify page and return its ID. The page will be visible unless 'published' is set to false.`,
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...sharedParameters.inputTitle, description: 'The title of the page.' },

    // optional parameters
    { ...sharedParameters.inputAuthor, description: 'The name of the author of the page.', optional: true },
    { ...sharedParameters.inputBodyHtml, optional: true },
    { ...sharedParameters.inputHandle, optional: true },
    { ...sharedParameters.inputPublished, optional: true },
    { ...sharedParameters.inputPublishedAt, optional: true },
    { ...parameters.templateSuffix, optional: true },
    { ...sharedParameters.metafields, optional: true, description: 'Page metafields to create.' },
  ],
  isAction: true,
  resultType: coda.ValueType.String,
  execute: async function (
    [title, author, bodyHtml, handle, published, publishedAt, templateSuffix, metafields],
    context
  ) {
    const restParams: PageCreateRestParams = {
      title,
      author,
      body_html: bodyHtml,
      handle,
      published,
      published_at: publishedAt,
      template_suffix: templateSuffix,
    };

    if (metafields && metafields.length) {
      const parsedMetafieldKeyValueSets: CodaMetafieldKeyValueSet[] = metafields.map((m) => JSON.parse(m));
      const metafieldRestInputs = parsedMetafieldKeyValueSets
        .map(formatMetafieldRestInputFromMetafieldKeyValueSet)
        .filter((m) => m);
      if (metafieldRestInputs.length) {
        restParams.metafields = metafieldRestInputs;
      }
    }

    const response = await createPageRest(restParams, context);
    return response.body.page.id;
  },
});

export const Action_UpdatePage = coda.makeFormula({
  name: 'UpdatePage',
  description: 'Update an existing Shopify page and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    parameters.pageID,

    // optional parameters
    { ...sharedParameters.inputAuthor, description: 'The name of the author of the page.', optional: true },
    { ...sharedParameters.inputBodyHtml, optional: true },
    { ...sharedParameters.inputHandle, optional: true },
    { ...sharedParameters.inputPublished, optional: true },
    { ...sharedParameters.inputPublishedAt, optional: true },
    { ...sharedParameters.inputTitle, description: 'The title of the page.', optional: true },
    { ...parameters.templateSuffix, optional: true },
    { ...sharedParameters.metafields, optional: true, description: 'Page metafields to update.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  // TODO: keep this for all but disable the update for relation columns
  // TODO: ask on coda community: on fait comment pour que update les trucs dynamiques ? Genre les metafields ?
  schema: coda.withIdentity(PageSchema, IDENTITY_PAGE),
  execute: async function (
    [pageId, author, bodyHtml, handle, published, publishedAt, title, templateSuffix, metafields],
    context
  ) {
    const restParams: PageUpdateRestParams = {
      author,
      body_html: bodyHtml,
      handle,
      published,
      published_at: publishedAt,
      title,
      template_suffix: templateSuffix,
    };

    let obj = { id: pageId };

    const restResponse = await updatePageRest(pageId, restParams, context);
    if (restResponse.body?.page) {
      obj = {
        ...obj,
        ...formatPageForSchemaFromRestApi(restResponse.body.page, context),
      };
    }

    if (metafields && metafields.length) {
      const parsedMetafieldKeyValueSets: CodaMetafieldKeyValueSet[] = metafields.map((s) => JSON.parse(s));
      const updatedMetafieldFields = await handleResourceMetafieldsUpdateRest(
        pageId,
        restResources.Page,
        parsedMetafieldKeyValueSets,
        context
      );
    }

    return obj;
  },
});

export const Action_DeletePage = coda.makeFormula({
  name: 'DeletePage',
  description: 'Delete an existing Shopify page and return true on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.pageID],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([pageId], context) {
    await deletePageRest(pageId, context);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Page = coda.makeFormula({
  name: 'Page',
  description: 'Return a single page from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.pageID],
  resultType: coda.ValueType.Object,
  schema: PageSchema,
  execute: async ([pageId], context) => {
    const pageResponse = await fetchPageRest(pageId, context);
    if (pageResponse.body?.page) {
      return formatPageForSchemaFromRestApi(pageResponse.body.page, context);
    }
  },
});

export const Format_Page: coda.Format = {
  name: 'Page',
  instructions: 'Paste the page Id into the column.',
  formulaName: 'Page',
};
// #endregion
