import * as coda from '@codahq/packs-sdk';

import {
  IDENTITY_PAGE,
  METAFIELD_GID_PREFIX_KEY,
  METAFIELD_PREFIX_KEY,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import { fetchPage, updatePage, deletePage, createPage, validatePageParams, formatPage } from './pages-functions';

import { PageSchema, pageFieldDependencies } from './pages-schema';
import { sharedParameters } from '../shared-parameters';
import { augmentSchemaWithMetafields } from '../metafields/metafields-schema';
import {
  createResourceMetafield,
  deleteMetafieldRest,
  fetchMetafieldDefinitions,
  fetchResourceMetafields,
  findMatchingMetafieldDefinition,
  formatMetafieldValueForApi,
  formatMetafieldsForSchema,
  getMetaFieldRealFromKey,
  getResourceMetafieldByNamespaceKey,
  getResourceMetafieldsRestUrl,
  separatePrefixedMetafieldsKeysFromKeys,
  splitMetaFieldFullKey,
} from '../metafields/metafields-functions';
import { graphQlGidToId } from '../helpers-graphql';
import { SyncTableRestContinuation } from '../types/tableSync';
import { MetafieldDefinition } from '../types/admin.types';
import { MetafieldOwnerType } from '../types/Metafields';
import { handleFieldDependencies } from '../helpers';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import type { Metafield as MetafieldRest } from '@shopify/shopify-api/rest/admin/2023-10/metafield';

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
  // #region Sync Tables
  pack.addSyncTable({
    name: 'Pages',
    description: 'Return Pages from this shop.',
    identityName: IDENTITY_PAGE,
    schema: PageSchema,
    dynamicOptions: {
      getSchema: async function (context, _, { syncMetafields }) {
        let augmentedSchema: any = PageSchema;
        if (syncMetafields) {
          augmentedSchema = await augmentSchemaWithMetafields(PageSchema, MetafieldOwnerType.Page, context);
        }
        // admin_url should always be the last featured property, regardless of any metafield keys added previously
        augmentedSchema.featuredProperties.push('admin_url');
        return augmentedSchema;
      },
      defaultAddDynamicColumns: false,
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
        const prevContinuation = context.sync.continuation as SyncTableRestContinuation;
        const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
        const effectiveMetafieldKeys = effectivePropertyKeys
          .filter((key) => key.startsWith(METAFIELD_PREFIX_KEY) || key.startsWith(METAFIELD_GID_PREFIX_KEY))
          .map(getMetaFieldRealFromKey);
        const shouldSyncMetafields = !!effectiveMetafieldKeys.length;
        let metafieldDefinitions: MetafieldDefinition[] = [];
        if (shouldSyncMetafields) {
          metafieldDefinitions =
            prevContinuation?.extraContinuationData?.metafieldDefinitions ??
            (await fetchMetafieldDefinitions(MetafieldOwnerType.Page, context));
        }
        const syncedFields = handleFieldDependencies(effectivePropertyKeys, pageFieldDependencies);

        const params = cleanQueryParams({
          fields: syncedFields.join(', '),
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
          restResult = response.body.pages.map((page) => formatPage(page, context));
        }

        // Add metafields by doing multiple Rest Admin API calls
        if (shouldSyncMetafields) {
          restResult = await Promise.all(
            restResult.map(async (resource) => {
              const response = await fetchResourceMetafields(
                getResourceMetafieldsRestUrl('pages', resource.id, context),
                {},
                context
              );

              // Only keep metafields that have a definition are in the schema
              const metafields: MetafieldRest[] = response.body.metafields.filter((meta: MetafieldRest) =>
                effectiveMetafieldKeys.includes(`${meta.namespace}.${meta.key}`)
              );
              if (metafields.length) {
                return {
                  ...resource,
                  ...formatMetafieldsForSchema(metafields, metafieldDefinitions),
                };
              }
              return resource;
            })
          );
        }

        return { result: restResult, continuation };
      },
      maxUpdateBatchSize: 10,
      executeUpdate: async function (args, updates, context: coda.SyncExecutionContext) {
        const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
        const { prefixedMetafieldFromKeys: schemaPrefixedMetafieldFromKeys, standardFromKeys } =
          separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);
        const effectiveMetafieldKeys = schemaPrefixedMetafieldFromKeys.map(getMetaFieldRealFromKey);
        const hasMetafieldsInSchema = !!effectiveMetafieldKeys.length;
        // TODO: fetch metafield definitions only if a metafield update is detected, and not only if metafields are present in the schema
        const metafieldDefinitions = hasMetafieldsInSchema
          ? await fetchMetafieldDefinitions(MetafieldOwnerType.Page, context)
          : [];

        const jobs = updates.map(async (update) => {
          const { updatedFields } = update;
          const pageGid = update.previousValue.admin_graphql_api_id;

          const updatedMetafieldKeys = updatedFields.filter((key) => schemaPrefixedMetafieldFromKeys.includes(key));
          const updatedNonMetafieldKeys = updatedFields.filter((key) => standardFromKeys.includes(key));
          let nonMetafieldNewValues = {};
          let metafieldNewValues = {};

          const restFields = {};
          updatedNonMetafieldKeys.forEach((key) => {
            restFields[key] = update.newValue[key];
          });

          if (Object.keys(restFields).length) {
            nonMetafieldNewValues = await updatePage(pageGid, restFields, context);
          }

          if (updatedMetafieldKeys.length) {
            // Update metafields. We must do it via Rest Admin API for pages as it's not supported by GraphQL
            const updatedMetafields = (
              await Promise.all(
                updatedMetafieldKeys.map(async (propKey) => {
                  const value = update.newValue[propKey] as string;
                  const realKey = getMetaFieldRealFromKey(propKey);
                  const { metaNamespace, metaKey } = splitMetaFieldFullKey(realKey);

                  // TODO: Faster processing of deletions possible ?
                  // Delete metafield if value is empty
                  if (value === undefined || value === '') {
                    const matchingMetafield = await getResourceMetafieldByNamespaceKey(
                      graphQlGidToId(pageGid),
                      'page',
                      metaNamespace,
                      metaKey,
                      context
                    );
                    if (matchingMetafield) {
                      await deleteMetafieldRest(matchingMetafield.id, context);
                      return {
                        ...matchingMetafield,
                        value: undefined,
                      };
                    }
                  }

                  const metafieldDefinition = findMatchingMetafieldDefinition(realKey, metafieldDefinitions);
                  const formattedApiValue = formatMetafieldValueForApi(propKey, value, metafieldDefinition);
                  const res = await createResourceMetafield(
                    [
                      graphQlGidToId(pageGid),
                      'page',
                      metaNamespace,
                      metaKey,
                      formattedApiValue,
                      metafieldDefinition.type.name,
                    ],
                    context
                  );

                  return res.body.metafield;
                })
              )
            )
              // remove all falsy values
              .filter((f) => f);

            console.log('updatedMetafields', updatedMetafields);
            metafieldNewValues = formatMetafieldsForSchema(updatedMetafields, metafieldDefinitions);
          }

          return { ...update.previousValue, ...nonMetafieldNewValues, ...metafieldNewValues };
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
  // #endregion

  // #region Actions
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
  // #endregion

  // #region Formulas
  pack.addFormula({
    name: 'Page',
    description: 'Return a single page from this shop.',
    parameters: [parameters.pageGID],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: PageSchema,
    execute: fetchPage,
  });

  pack.addColumnFormat({
    name: 'Page',
    instructions: 'Paste the GraphQL GID of the page into the column.',
    formulaName: 'Page',
  });
  // #endregion
};
