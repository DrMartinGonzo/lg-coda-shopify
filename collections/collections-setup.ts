// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CollectSyncTableSchema } from '../schemas/syncTable/CollectSchema';
import { CollectionSyncTableSchema } from '../schemas/syncTable/CollectionSchema';
import {
  CollectionRestFetcher,
  CustomCollectionRestFetcher,
  CollectRestFetcher,
  Collection,
  CollectSyncTable,
} from './collections-functions';

import { CACHE_DEFAULT, COLLECTION_TYPE__CUSTOM, COLLECTION_TYPE__SMART } from '../constants';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../shared-parameters';
import { augmentSchemaWithMetafields, parseMetafieldsCodaInput } from '../metafields/metafields-functions';
import { wrapGetSchemaForCli } from '../helpers';
import { getTemplateSuffixesFor } from '../themes/themes-functions';
import { MetafieldOwnerType } from '../types/admin.types';
import { Identity } from '../constants';
import { graphQlGidToId, idToGraphQlGid } from '../helpers-graphql';
import { GraphQlResourceName } from '../types/RequestsGraphQl';

import type { Collection as CollectionType } from '../typesNew/Resources/Collection';
import type { SyncTableMixedContinuation } from '../types/SyncTable';

// #endregion

async function getCollectionSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = CollectionSyncTableSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(
      CollectionSyncTableSchema,
      MetafieldOwnerType.Collection,
      context
    );
  }
  // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

// #region Sync tables
export const Sync_Collects = coda.makeSyncTable({
  name: 'Collects',
  description: 'Return Collects from this shop. The Collect resource connects a product to a custom collection.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Collect,
  schema: CollectSyncTableSchema,
  formula: {
    name: 'SyncCollects',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [{ ...filters.collection.id, optional: true }],
    execute: async (params, context: coda.SyncExecutionContext) => {
      const collectSyncTable = new CollectSyncTable(new CollectRestFetcher(context), params);
      return collectSyncTable.executeSync(CollectSyncTableSchema);
    },
  },
});

export const Sync_Collections = coda.makeSyncTable({
  name: 'Collections',
  description:
    'Return Collections from this shop. A collection is a grouping of products that merchants can create to make their stores easier to browse. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Collection,
  schema: CollectionSyncTableSchema,
  dynamicOptions: {
    getSchema: getCollectionSchema,
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return getTemplateSuffixesFor('collection', context);
      }
    },
  },
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
      // If executing from CLI, schema is undefined, we have to retrieve it first
      const schema =
        context.sync.schema ?? (await wrapGetSchemaForCli(getCollectionSchema, context, { syncMetafields }));
      const prevContinuation = context.sync.continuation as SyncTableMixedContinuation;
      let restType = prevContinuation?.extraContinuationData?.restType ?? COLLECTION_TYPE__CUSTOM;

      const collectionSyncTable = Collection.getSyncTableOfType(restType, params, context);
      return collectionSyncTable.executeSync(schema);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const collectionGIds = updates.map((update) =>
        idToGraphQlGid(GraphQlResourceName.Collection, update.previousValue.id)
      );
      const collectionTypes = await Collection.getCollectionTypes(collectionGIds, context);

      const customCollectionsUpdates = collectionTypes
        .filter((c) => c.type === COLLECTION_TYPE__CUSTOM)
        .map((c) => updates.find((update) => update.previousValue.id === graphQlGidToId(c.id)));
      const smartCollectionsUpdates = collectionTypes
        .filter((c) => c.type === COLLECTION_TYPE__SMART)
        .map((c) => updates.find((update) => update.previousValue.id === graphQlGidToId(c.id)));

      const jobs: Array<Promise<{ result: any }>> = [];
      if (customCollectionsUpdates.length) {
        const customCollectionSyncTable = Collection.getSyncTableOfType(COLLECTION_TYPE__CUSTOM, params, context);
        jobs.push(customCollectionSyncTable.executeUpdate(customCollectionsUpdates));
      }
      if (smartCollectionsUpdates.length) {
        const customCollectionSyncTable = Collection.getSyncTableOfType(COLLECTION_TYPE__SMART, params, context);
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
    let newRow: Partial<CollectionType.Row> = {
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
    const restParams = collectionFetcher.formatRowToApi(newRow, metafieldKeyValueSets) as CollectionType.Params.Create;
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
    let row: CollectionType.Row = {
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
    const collectionFetcher = await Collection.getFetcher(collectionId, context);
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
    const collectionFetcher = await Collection.getFetcher(collectionId, context);
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

/*
pack.addFormula({
  name: 'Collect',
  description: 'Get a single collect data.',
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'collectID',
      description: 'The ID of the collection.',
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'fields',
      description: 'Retrieve only certain fields, specified by a comma-separated list of fields names.',
      optional: true,
    }),
  ],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: CollectSchema,
  execute: fetchCollect,
});
*/
// #endregion
