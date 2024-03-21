// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CACHE_DEFAULT } from '../../constants';
import { PageRestFetcher } from './PageRestFetcher';
import { PageSyncTable } from './PageSyncTable';

import { Identity } from '../../constants';
import { augmentSchemaWithMetafields } from '../../schemas/schema-helpers';
import { PageSyncTableSchema } from '../../schemas/syncTable/PageSchema';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../../shared-parameters';
import { MetafieldOwnerType } from '../../types/admin.types';
import { parseMetafieldsCodaInput } from '../metafields/metafields-functions';
import { getTemplateSuffixesFor } from '../themes/themes-functions';
import { Page } from './pageResource';
import { handleDynamicSchemaForCli } from '../../Fetchers/SyncTableRest';
import { deepCopy } from '../../utils/helpers';

// #endregion

async function getPageSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = deepCopy(PageSyncTableSchema);
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(PageSyncTableSchema, MetafieldOwnerType.Page, context);
  }
  // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');

  return augmentedSchema;
}

// #region Sync Tables
export const Sync_Pages = coda.makeSyncTable({
  name: 'Pages',
  description:
    "Return Pages from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings, but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for pages, we have to do a separate Rest call for each page to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Page,
  schema: PageSyncTableSchema,
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
        ...filters.general.syncMetafields,
        description:
          "description: 'Also retrieve metafields. Not recommanded if you have lots of pages, the sync will be much slower as the pack will have to do another API call for each page. Waiting for Shopify to add GraphQL access to pages...',",
        optional: true,
      },
      { ...filters.general.createdAtRange, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.general.publishedAtRange, optional: true },
      { ...filters.general.handle, optional: true },
      { ...filters.general.publishedStatus, optional: true },
      { ...filters.general.sinceId, optional: true },
      { ...filters.general.title, optional: true },
    ],
    execute: async function (params, context) {
      const [syncMetafields] = params;
      const schema = await handleDynamicSchemaForCli(getPageSchema, context, { syncMetafields });
      const pageSyncTable = new PageSyncTable(new PageRestFetcher(context), params);
      return pageSyncTable.executeSync(schema);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const pageSyncTable = new PageSyncTable(new PageRestFetcher(context), params);
      return pageSyncTable.executeUpdate(updates);
    },
  },
});
// #endregion

// #region Actions
export const Action_CreatePage = coda.makeFormula({
  name: 'CreatePage',
  description: `Create a new Shopify page and return its ID. The page will be not be published unless 'published' is set to true or a published date is set.`,
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...inputs.general.title, description: 'The title of the page.' },

    // optional parameters
    { ...inputs.general.author, optional: true },
    { ...inputs.page.bodyHtml, optional: true },
    { ...inputs.general.handle, optional: true },
    { ...inputs.general.published, optional: true },
    { ...inputs.general.publishedAt, optional: true },
    { ...inputs.page.templateSuffix, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('create', 'Page'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function (
    [title, author, body_html, handle, published, published_at, template_suffix, metafields],
    context
  ) {
    const defaultPublishedStatus = false;
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    let newRow: Partial<Page['codaRow']> = {
      title,
      author,
      body_html,
      handle,
      published_at,
      published: published ?? defaultPublishedStatus,
      template_suffix,
    };

    const pageFetcher = new PageRestFetcher(context);
    const restParams = pageFetcher.formatRowToApi(newRow, metafieldKeyValueSets) as Page['rest']['params']['create'];
    const response = await pageFetcher.create(restParams);
    return response?.body?.page?.id;
  },
});

export const Action_UpdatePage = coda.makeFormula({
  name: 'UpdatePage',
  description: 'Update an existing Shopify page and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.page.id,

    // optional parameters
    { ...inputs.general.author, optional: true },
    { ...inputs.page.bodyHtml, optional: true },
    { ...inputs.general.handle, optional: true },
    { ...inputs.general.published, optional: true },
    { ...inputs.general.publishedAt, optional: true },
    { ...inputs.general.title, description: 'The title of the page.', optional: true },
    { ...inputs.page.templateSuffix, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('update', 'Page'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(PageSchema, Identity.Page),
  schema: PageSyncTableSchema,
  execute: async function (
    [pageId, author, body_html, handle, published, published_at, title, template_suffix, metafields],
    context
  ) {
    let row: Page['codaRow'] = {
      id: pageId,
      author,
      body_html,
      handle,
      published,
      published_at,
      title,
      template_suffix,
    };
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    const pageFetcher = new PageRestFetcher(context);
    return pageFetcher.updateWithMetafields({ original: undefined, updated: row }, metafieldKeyValueSets);
  },
});

export const Action_DeletePage = coda.makeFormula({
  name: 'DeletePage',
  description: 'Delete an existing Shopify page and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.page.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([pageId], context) {
    await new PageRestFetcher(context).delete(pageId);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Page = coda.makeFormula({
  name: 'Page',
  description: 'Return a single page from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.page.id],
  resultType: coda.ValueType.Object,
  cacheTtlSecs: CACHE_DEFAULT,
  schema: PageSyncTableSchema,
  execute: async ([pageId], context) => {
    const pageFetcher = new PageRestFetcher(context);
    const pageResponse = await pageFetcher.fetch(pageId);
    if (pageResponse.body?.page) {
      return pageFetcher.formatApiToRow(pageResponse.body.page);
    }
  },
});

export const Format_Page: coda.Format = {
  name: 'Page',
  instructions: 'Paste the page ID into the column.',
  formulaName: 'Page',
};
// #endregion
