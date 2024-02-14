import * as coda from '@codahq/packs-sdk';

import {
  CACHE_MINUTE,
  IDENTITY_PAGE,
  METAFIELD_PREFIX_KEY,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  fetchPageRest,
  deletePageRest,
  formatPageStandardFieldsRestParams,
  createPageRest,
  validatePageParams,
  formatPageForSchemaFromRestApi,
  handlePageUpdateJob,
} from './pages-functions';

import { PageSchema, pageFieldDependencies } from '../schemas/syncTable/PageSchema';
import { sharedParameters } from '../shared-parameters';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
} from '../metafields/metafields-functions';
import {
  fetchMetafieldDefinitionsGraphQl,
  fetchResourceMetafields,
  findMatchingMetafieldDefinition,
  removePrefixFromMetaFieldKey,
  getResourceMetafieldsRestUrl,
  separatePrefixedMetafieldsKeysFromKeys,
  splitMetaFieldFullKey,
} from '../metafields/metafields-functions';
import { SyncTableRestContinuation } from '../types/tableSync';
import { MetafieldDefinition } from '../types/admin.types';
import { MetafieldOwnerType, MetafieldRestInput } from '../types/Metafields';
import { arrayUnique, compareByDisplayKey, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import type { Metafield as MetafieldRest } from '@shopify/shopify-api/rest/admin/2023-10/metafield';
import {
  UpdateCreateProp,
  getMetafieldsCreateUpdateProps,
  getVarargsMetafieldDefinitionsAndUpdateCreateProps,
  parseVarargsCreateUpdatePropsValues,
} from '../helpers-varargs';
import { PageCreateRestParams } from '../types/Page';
import { getTemplateSuffixesFor } from '../themes/themes-functions';

async function getPageSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = PageSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(PageSchema, MetafieldOwnerType.Page, context);
  }
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');

  return augmentedSchema;
}

/**
 * The properties that can be updated when updating a page.
 */
const standardUpdateProps: UpdateCreateProp[] = [
  { display: 'Handle', key: 'handle', type: 'string' },
  { display: 'Published', key: 'published', type: 'boolean' },
  { display: 'Published at', key: 'published_at', type: 'string' },
  { display: 'Title', key: 'title', type: 'string' },
  { display: 'Body HTML', key: 'body_html', type: 'string' },
  { display: 'Author', key: 'author', type: 'string' },
  { display: 'Template suffix', key: 'template_suffix', type: 'string' },
];
/**
 * The properties that can be updated when creating a page.
 */
const standardCreateProps = [...standardUpdateProps.filter((prop) => prop.key !== 'title')];

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

export const setupPages = (pack: coda.PackDefinitionBuilder) => {
  // #region Sync Tables
  pack.addSyncTable({
    name: 'Pages',
    description: 'Return Pages from this shop.',
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
            (await fetchMetafieldDefinitionsGraphQl(MetafieldOwnerType.Page, context));
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

              const response = await fetchResourceMetafields(
                getResourceMetafieldsRestUrl('pages', resource.id, context),
                {},
                context
              );
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
          ? await fetchMetafieldDefinitionsGraphQl(MetafieldOwnerType.Page, context)
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
  // UpdatePage action
  pack.addFormula({
    name: 'UpdatePage',
    description: 'Update an existing Shopify page and return the updated data.',
    parameters: [parameters.pageID],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The page property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(
            MetafieldOwnerType.Page,
            context,
            CACHE_MINUTE
          );
          const searchObjs = standardUpdateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
          return result.sort(compareByDisplayKey);
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    // TODO: keep this for all but disable the update for relation columns
    // TODO: ask on coda community: on fait comment pour que update les trucs dynamiques ? Genre les metafields ?
    schema: coda.withIdentity(PageSchema, IDENTITY_PAGE),
    execute: async function ([page_id, ...varargs], context) {
      // Build a Coda update object for Rest Admin and GraphQL API updates
      // TODO: type is not perfect here
      let update: coda.SyncUpdate<string, string, any>;

      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Page, context);
      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardUpdateProps, metafieldUpdateCreateProps);

      update = {
        previousValue: { id: page_id },
        newValue: newValues,
        updatedFields: Object.keys(newValues),
      };
      update.newValue = cleanQueryParams(update.newValue);

      return handlePageUpdateJob(update, metafieldDefinitions, context);
    },
  });

  // CreatePage action
  pack.addFormula({
    name: 'CreatePage',
    description: `Create a new Shopify page and return GraphQl GID. The page will be visible unless 'published' is set to false.`,
    parameters: [parameters.inputTitle],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The page property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(
            MetafieldOwnerType.Page,
            context,
            CACHE_MINUTE
          );
          const searchObjs = standardCreateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
          return result.sort(compareByDisplayKey);
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async function ([title, ...varargs], context) {
      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Page, context);

      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardCreateProps, metafieldUpdateCreateProps);
      const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(
        Object.keys(newValues)
      );

      // We can use Rest Admin API to create metafields
      let metafieldRestInputs: MetafieldRestInput[] = [];
      prefixedMetafieldFromKeys.forEach((fromKey) => {
        const realFromKey = removePrefixFromMetaFieldKey(fromKey);
        const { metaKey, metaNamespace } = splitMetaFieldFullKey(realFromKey);
        const matchingMetafieldDefinition = findMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);
        const input: MetafieldRestInput = {
          namespace: metaNamespace,
          key: metaKey,
          value: newValues[fromKey],
          type: matchingMetafieldDefinition?.type.name,
        };
        metafieldRestInputs.push(input);
      });

      const params: PageCreateRestParams = {
        title,
        metafields: metafieldRestInputs.length ? metafieldRestInputs : undefined,
        // @ts-ignore
        ...formatPageStandardFieldsRestParams(standardFromKeys, newValues),
      };
      // default to unpublished for page creation
      if (params.published === undefined) {
        params.published = false;
      }

      const response = await createPageRest(params, context);
      return response.body.page.id;
    },
  });

  // DeletePage action
  pack.addFormula({
    name: 'DeletePage',
    description: 'Delete an existing Shopify page and return true on success.',
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
  pack.addFormula({
    name: 'Page',
    description: 'Return a single page from this shop.',
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

  pack.addColumnFormat({
    name: 'Page',
    instructions: 'Paste the page Id into the column.',
    formulaName: 'Page',
  });
  // #endregion
};
