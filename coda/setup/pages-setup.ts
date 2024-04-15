// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CodaMetafieldKeyValueSetNew } from '../CodaMetafieldKeyValueSet';
import { FromRow } from '../../Resources/AbstractResource_Synced';
import { Page } from '../../Resources/Rest/Page';
import { CACHE_DEFAULT, Identity } from '../../constants';
import { PageRow } from '../../schemas/CodaRows.types';
import { PageSyncTableSchema } from '../../schemas/syncTable/PageSchema';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';
import { getTemplateSuffixesFor } from '../../utils/themes-utils';

// #endregion

// #region Sync Tables
export const Sync_Pages = coda.makeSyncTable({
  name: 'Pages',
  description:
    "Return Pages from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings, but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for pages, we have to do a separate Rest call for each page to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Page,
  schema: PageSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return Page.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] });
    },
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
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link Page.getDynamicSchema}
     *  - {@link Page.makeSyncTableManagerSyncFunction}
     */
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
      return Page.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return Page.syncUpdate(params, updates, context);
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
    const fromRow: FromRow<PageRow> = {
      row: {
        title,
        author,
        body_html,
        handle,
        published_at,
        published: published ?? defaultPublishedStatus,
        template_suffix,
      },
      // prettier-ignore
      metafields: CodaMetafieldKeyValueSetNew
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_resource: Page.metafieldRestOwnerType })
      ),
    };

    const newPage = new Page({ context, fromRow });
    await newPage.saveAndUpdate();
    return newPage.apiData.id;
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
    const fromRow: FromRow<PageRow> = {
      row: {
        id: pageId,
        author,
        body_html,
        handle,
        published,
        published_at,
        title,
        template_suffix,
      },
      // prettier-ignore
      metafields: CodaMetafieldKeyValueSetNew
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_id: pageId, owner_resource: Page.metafieldRestOwnerType })
      ),
    };

    const updatedPage = new Page({ context, fromRow });
    await updatedPage.saveAndUpdate();
    return updatedPage.formatToRow();
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
    await Page.delete({ context, id: pageId });
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
    const article = await Page.find({ context, id: pageId });
    return article.formatToRow();
  },
});

export const Format_Page: coda.Format = {
  name: 'Page',
  instructions: 'Paste the page ID into the column.',
  formulaName: 'Page',
};
// #endregion
