// #region Imports
import * as coda from '@codahq/packs-sdk';

import { PageClient } from '../../Clients/RestClients';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { optionValues } from '../utils/coda-utils';
import { OPTIONS_PUBLISHED_STATUS } from '../../constants/options-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { getTemplateSuffixesFor } from '../../models/rest/AssetModel';
import { PageModel } from '../../models/rest/PageModel';
import { PageSyncTableSchema } from '../../schemas/syncTable/PageSchema';
import { SyncedPages } from '../../sync/rest/SyncedPages';
import { makeDeleteRestResourceAction, makeFetchSingleRestResourceAction } from '../utils/coda-utils';
import { assertAllowedValue, isNullishOrEmpty } from '../../utils/helpers';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedPages(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedPages({
    context,
    codaSyncParams,
    model: PageModel,
    client: PageClient.createInstance(context),
    validateSyncParams,
  });
}

function validateSyncParams({ publishedStatus }: { publishedStatus?: string }) {
  const invalidMsg: string[] = [];
  if (
    !isNullishOrEmpty(publishedStatus) &&
    !assertAllowedValue(publishedStatus, optionValues(OPTIONS_PUBLISHED_STATUS))
  ) {
    invalidMsg.push(`publishedStatus: ${publishedStatus}`);
  }
  if (invalidMsg.length) {
    throw new InvalidValueVisibleError(invalidMsg.join(', '));
  }
}
// #endregion

// #region Sync Tables
export const Sync_Pages = coda.makeSyncTable({
  name: 'Pages',
  description:
    "Return Pages from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings, but be aware that it will slow down the sync (Shopify doesn't yet support GraphQL calls for pages, we have to do a separate Rest call for each page to get its metafields).",
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Page,
  schema: SyncedPages.staticSchema,
  dynamicOptions: {
    getSchema: async (context, _, formulaContext) =>
      SyncedPages.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] }),
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return getTemplateSuffixesFor({ kind: 'page', context });
      }
    },
  },
  formula: {
    name: 'SyncPages',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedPages.codaParamsMap}
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
    execute: async (codaSyncParams, context) => createSyncedPages(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedPages(codaSyncParams, context).executeSyncUpdate(updates),
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
    const page = PageModel.createInstanceFromRow(context, {
      id: undefined,
      title,
      author,
      body_html,
      handle,
      published_at,
      published: published ?? defaultPublishedStatus,
      template_suffix,
    });
    if (metafields) {
      page.data.metafields = CodaMetafieldSet.createRestMetafieldsArray(metafields, {
        context,
        ownerResource: PageModel.metafieldRestOwnerType,
      });
    }

    await page.save();
    return page.data.id;
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
  // schema: coda.withIdentity(PageSchema, IdentitiesNew.page),
  schema: PageSyncTableSchema,
  execute: async function (
    [pageId, author, body_html, handle, published, published_at, title, template_suffix, metafields],
    context
  ) {
    const page = PageModel.createInstanceFromRow(context, {
      id: pageId,
      author,
      body_html,
      handle,
      published,
      published_at,
      title,
      template_suffix,
    });
    if (metafields) {
      page.data.metafields = CodaMetafieldSet.createRestMetafieldsArray(metafields, {
        context,
        ownerResource: PageModel.metafieldRestOwnerType,
        ownerId: pageId,
      });
    }

    await page.save();
    return page.toCodaRow();
  },
});

export const Action_DeletePage = makeDeleteRestResourceAction({
  modelName: PageModel.displayName,
  IdParameter: inputs.page.id,
  execute: async ([itemId], context) => {
    await PageClient.createInstance(context).delete({ id: itemId as number });
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Page = makeFetchSingleRestResourceAction({
  modelName: PageModel.displayName,
  IdParameter: inputs.page.id,
  schema: SyncedPages.staticSchema,
  execute: async ([itemId], context) => {
    const response = await PageClient.createInstance(context).single({ id: itemId as number });
    return PageModel.createInstance(context, response.body).toCodaRow();
  },
});

export const Format_Page: coda.Format = {
  name: 'Page',
  instructions: 'Paste the page ID into the column.',
  formulaName: 'Page',
};
// #endregion
