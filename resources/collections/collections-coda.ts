// #region Imports
import * as coda from '@codahq/packs-sdk';

import { SyncTableMixedContinuation, handleDynamicSchemaForCli } from '../../Fetchers/SyncTableRest';
import { CACHE_DEFAULT, COLLECTION_TYPE__CUSTOM, COLLECTION_TYPE__SMART, Identity } from '../../constants';
import { graphQlGidToId, idToGraphQlGid } from '../../helpers-graphql';
import { CollectionSyncTableSchema } from '../../schemas/syncTable/CollectionSchema';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../../shared-parameters';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { parseMetafieldsCodaInput } from '../metafields/metafields-functions';
import { CollectionRestFetcher } from './CollectionRestFetcher';
import { CollectionSyncTableBase } from './CollectionSyncTableBase';
import { Collection } from './collectionResource';
import { getCollectionFetcher, getCollectionSyncTableOfType, getCollectionTypes } from './collections-helpers';
import { CustomCollectionRestFetcher } from './custom_collection/CustomCollectionRestFetcher';

// #region Sync tables
export const Sync_Collections = coda.makeSyncTable({
  name: 'Collections',
  description:
    'Return Collections from this shop. A collection is a grouping of products that merchants can create to make their stores easier to browse. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Collection,
  schema: CollectionSyncTableSchema,
  dynamicOptions: CollectionSyncTableBase.dynamicOptions,
  formula: {
    name: 'SyncCollections',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      { ...filters.general.syncMetafields, optional: true },
      { ...filters.general.createdAtRange, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.general.publishedAtRange, optional: true },

      { ...filters.general.handle, optional: true },
      { ...filters.collection.idArray, optional: true },
      { ...filters.product.id, name: 'productId', optional: true },

      { ...filters.general.publishedStatus, optional: true },
      { ...filters.general.title, optional: true },
    ],
    execute: async function (params, context: coda.SyncExecutionContext) {
      const [syncMetafields] = params;
      const schema = await handleDynamicSchemaForCli(CollectionSyncTableBase.dynamicOptions.getSchema, context, {
        syncMetafields,
      });
      const prevContinuation = context.sync.continuation as SyncTableMixedContinuation<Collection['codaRow']>;
      let restType = prevContinuation?.extraContinuationData?.restType ?? COLLECTION_TYPE__CUSTOM;

      const collectionSyncTable = getCollectionSyncTableOfType(restType, params, context);
      return collectionSyncTable.executeSync(schema);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const collectionGIds = updates.map((update) =>
        idToGraphQlGid(GraphQlResourceName.Collection, update.previousValue.id)
      );
      const collectionTypes = await getCollectionTypes(collectionGIds, context);

      const customCollectionsUpdates = collectionTypes
        .filter((c) => c.type === COLLECTION_TYPE__CUSTOM)
        .map((c) => updates.find((update) => update.previousValue.id === graphQlGidToId(c.id)));
      const smartCollectionsUpdates = collectionTypes
        .filter((c) => c.type === COLLECTION_TYPE__SMART)
        .map((c) => updates.find((update) => update.previousValue.id === graphQlGidToId(c.id)));

      const jobs: Array<Promise<{ result: any }>> = [];
      if (customCollectionsUpdates.length) {
        const customCollectionSyncTable = getCollectionSyncTableOfType(COLLECTION_TYPE__CUSTOM, params, context);
        jobs.push(customCollectionSyncTable.executeUpdate(customCollectionsUpdates));
      }
      if (smartCollectionsUpdates.length) {
        const customCollectionSyncTable = getCollectionSyncTableOfType(COLLECTION_TYPE__SMART, params, context);
        jobs.push(customCollectionSyncTable.executeUpdate(smartCollectionsUpdates));
      }

      return {
        result: (await Promise.all(jobs)).map((j) => j.result).flat(),
      };
    },
  },
});

// #endregion

// #region Actions
export const Action_CreateCollection = coda.makeFormula({
  name: 'CreateCollection',
  description: `Create a new Shopify Collection and return its ID. The collection will be unpublished by default.`,
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...inputs.general.title, description: 'The name of the collection.' },

    // optional parameters
    { ...inputs.collection.bodyHtml, optional: true },
    { ...inputs.general.handle, optional: true },
    { ...inputs.general.imageUrl, optional: true },
    { ...inputs.general.imageAlt, optional: true },
    { ...inputs.general.published, description: 'Whether the collection is visible.', optional: true },
    { ...inputs.collection.templateSuffix, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('create', 'Collection'),
    },
  ],

  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function (
    [title, body_html, handle, image_url, image_alt_text, published, template_suffix, metafields],
    context
  ) {
    const defaultPublishedStatus = false;
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    let newRow: Partial<Collection['codaRow']> = {
      title,
      body_html,
      handle,
      published: published ?? defaultPublishedStatus,
      template_suffix,
      image_url,
      image_alt_text,
    };

    // TODO: support creating smart collections
    const collectionFetcher = new CustomCollectionRestFetcher(context);
    const restParams = collectionFetcher.formatRowToApi(
      newRow,
      metafieldKeyValueSets
    ) as Collection['rest']['params']['create'];
    const response = await collectionFetcher.create(restParams);
    return response?.body?.custom_collection.id;
  },
});

export const Action_UpdateCollection = coda.makeFormula({
  name: 'UpdateCollection',
  description: 'Update an existing Shopify collection and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.collection.id,

    // optional parameters
    { ...inputs.collection.bodyHtml, optional: true },
    { ...inputs.general.title, description: 'The title of the collection.', optional: true },
    { ...inputs.general.handle, optional: true },
    { ...inputs.general.imageUrl, optional: true },
    { ...inputs.general.imageAlt, optional: true },
    { ...inputs.general.published, description: 'Whether the collection is visible.', optional: true },
    { ...inputs.collection.templateSuffix, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('update', 'Collection'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(CollectionSchema, Identity.Collection),
  schema: CollectionSyncTableSchema,
  execute: async (
    [collectionId, bodyHtml, title, handle, imageUrl, imageAlt, published, templateSuffix, metafields],
    context
  ) => {
    let row: Collection['codaRow'] = {
      id: collectionId,
      body_html: bodyHtml,
      handle,
      published,
      template_suffix: templateSuffix,
      title,
      image_alt_text: imageAlt,
      image_url: imageUrl,
    };
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    const collectionFetcher = await getCollectionFetcher(collectionId, context);
    return collectionFetcher.updateWithMetafields({ original: undefined, updated: row }, metafieldKeyValueSets);
  },
});

export const Action_DeleteCollection = coda.makeFormula({
  name: 'DeleteCollection',
  description: 'Delete an existing Shopify Collection and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.collection.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([collectionId], context) {
    const collectionFetcher = await getCollectionFetcher(collectionId, context);
    await collectionFetcher.delete(collectionId);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Collection = coda.makeFormula({
  name: 'Collection',
  description: 'Return a single collection from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.collection.id,
    //! field filter Doesn't seem to work
    // { ...sharedParameters.filterFields, optional: true }
  ],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: CollectionSyncTableSchema,
  execute: async function ([collectionId], context) {
    const collectionFetcher = new CollectionRestFetcher(context);
    const collectionResponse = await collectionFetcher.fetch(collectionId);
    if (collectionResponse?.body?.collection) {
      return collectionFetcher.formatApiToRow(collectionResponse.body.collection);
    }
  },
});

export const Format_Collection: coda.Format = {
  name: 'Collection',
  instructions: 'Paste the collection ID into the column.',
  formulaName: 'Collection',
};

// #endregion
