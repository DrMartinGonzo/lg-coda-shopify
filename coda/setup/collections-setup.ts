// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FromRow } from '../../Resources/Abstract/Rest/AbstractSyncedRestResource';
import { Asset } from '../../Resources/Rest/Asset';
import { Collection } from '../../Resources/Rest/Collection';
import { MergedCollection } from '../../Resources/Rest/MergedCollection';
import { MergedCollection_Custom } from '../../Resources/Rest/MergedCollection_Custom';
import { MergedCollection_Smart } from '../../Resources/Rest/MergedCollection_Smart';
import {
  GraphQlResourceNames,
  RestResourceSingular,
  RestResourcesSingular,
} from '../../Resources/types/Resource.types';
import { SyncTableMixedContinuation, SyncTableUpdateResult } from '../../SyncTableManager/types/SyncTable.types';
import { CACHE_DEFAULT, PACK_IDENTITIES } from '../../constants';
import { CollectionRow } from '../../schemas/CodaRows.types';
import { CollectionSyncTableSchema } from '../../schemas/syncTable/CollectionSchema';
import { getCollectionType, getCollectionTypes } from '../../utils/collections-utils';
import { graphQlGidToId, idToGraphQlGid } from '../../utils/conversion-utils';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';

// #region Sync tables
export const Sync_Collections = coda.makeSyncTable({
  name: 'Collections',
  description:
    'Return Collections from this shop. A collection is a grouping of products that merchants can create to make their stores easier to browse. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Collection,
  schema: CollectionSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return MergedCollection.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] });
    },
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return Asset.getTemplateSuffixesFor({ kind: 'collection', context });
      }
    },
  },
  formula: {
    name: 'SyncCollections',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link MergedCollection.getDynamicSchema}
     *  - {@link MergedCollection_Custom.makeSyncTableManagerSyncFunction}
     *  - {@link MergedCollection_Smart.makeSyncTableManagerSyncFunction}
     */
    parameters: [
      { ...filters.general.syncMetafields, optional: true },
      // TODO: not sure this one works -> TEST
      { ...filters.general.createdAtRange, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.general.publishedAtRange, optional: true },

      { ...filters.general.handle, optional: true },
      { ...filters.collection.idArray, optional: true },
      { ...filters.product.id, name: 'productId', optional: true },

      { ...filters.general.publishedStatus, optional: true },
      { ...filters.general.title, optional: true },
    ],
    execute: async function (params, context) {
      const prevContinuation = context.sync.continuation as SyncTableMixedContinuation<CollectionRow>;
      const currentResourceName: RestResourceSingular = prevContinuation?.extraData?.currentResourceName;

      if (currentResourceName === RestResourcesSingular.SmartCollection) {
        return MergedCollection_Smart.sync(params, context);
      }
      return MergedCollection_Custom.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const gids = updates.map(({ previousValue }) =>
        idToGraphQlGid(GraphQlResourceNames.Collection, previousValue.id)
      );
      const collectionTypes = await getCollectionTypes(gids, context);

      const customCollectionIds = collectionTypes
        .filter(({ type }) => type === RestResourcesSingular.CustomCollection)
        .map(({ id }) => graphQlGidToId(id));
      const customCollectionsUpdates = updates.filter(({ previousValue }) =>
        customCollectionIds.includes(previousValue.id)
      );

      const smartCollectionIds = collectionTypes
        .filter(({ type }) => type === RestResourcesSingular.SmartCollection)
        .map(({ id }) => graphQlGidToId(id));
      const smartCollectionsUpdates = updates.filter(({ previousValue }) =>
        smartCollectionIds.includes(previousValue.id)
      );

      const jobs: Array<Promise<SyncTableUpdateResult>> = [];
      if (customCollectionsUpdates.length) {
        jobs.push(MergedCollection_Custom.syncUpdate(params, customCollectionsUpdates, context));
      }
      if (smartCollectionsUpdates.length) {
        jobs.push(MergedCollection_Smart.syncUpdate(params, smartCollectionsUpdates, context));
      }

      const results = await Promise.all(jobs);
      return {
        result: results.flatMap((r) => r.result),
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
    const fromRow: FromRow<CollectionRow> = {
      row: {
        title,
        body_html,
        handle,
        published: published ?? defaultPublishedStatus,
        template_suffix,
        image_url,
        image_alt_text,
      },
      // prettier-ignore
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_resource: Collection.metafieldRestOwnerType })
      ),
    };

    const newCustomCollection = new MergedCollection_Custom({ context, fromRow });
    await newCustomCollection.saveAndUpdate();
    return newCustomCollection.apiData.id;
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
  // schema: coda.withIdentity(CollectionSchema, IdentitiesNew.collection),
  schema: CollectionSyncTableSchema,
  execute: async (
    [collectionId, bodyHtml, title, handle, imageUrl, imageAlt, published, templateSuffix, metafields],
    context
  ) => {
    const fromRow: FromRow<CollectionRow> = {
      row: {
        id: collectionId,
        body_html: bodyHtml,
        handle,
        published,
        template_suffix: templateSuffix,
        title,
        image_alt_text: imageAlt,
        image_url: imageUrl,
      },
      // prettier-ignore
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_id: collectionId, owner_resource: Collection.metafieldRestOwnerType })
      ),
    };

    const collectionType = await getCollectionType(
      idToGraphQlGid(GraphQlResourceNames.Collection, collectionId),
      context
    );
    const collectionClass =
      collectionType === RestResourcesSingular.SmartCollection ? MergedCollection_Smart : MergedCollection_Custom;
    const updatedCollection = new collectionClass({ context, fromRow });
    await updatedCollection.saveAndUpdate();
    return updatedCollection.formatToRow();
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
    const collectionType = await getCollectionType(
      idToGraphQlGid(GraphQlResourceNames.Collection, collectionId),
      context
    );
    const collectionClass =
      collectionType === RestResourcesSingular.SmartCollection ? MergedCollection_Smart : MergedCollection_Custom;
    await collectionClass.delete({ context, id: collectionId });
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
    const collectionType = await getCollectionType(
      idToGraphQlGid(GraphQlResourceNames.Collection, collectionId),
      context
    );
    const collectionClass =
      collectionType === RestResourcesSingular.SmartCollection ? MergedCollection_Smart : MergedCollection_Custom;
    const collection = await collectionClass.find({ context, id: collectionId });
    return collection.formatToRow();
  },
});

export const Format_Collection: coda.Format = {
  name: 'Collection',
  instructions: 'Paste the collection ID into the column.',
  formulaName: 'Collection',
};

// #endregion
