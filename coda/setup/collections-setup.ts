// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CustomCollectionClient, SmartCollectionClient } from '../../Clients/RestApiClientBase';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import {
  GraphQlResourceNames,
  RestResourceSingular,
  RestResourcesSingular,
} from '../../Resources/types/SupportedResource';
import { OPTIONS_PUBLISHED_STATUS, PACK_IDENTITIES, optionValues } from '../../constants';
import { getTemplateSuffixesFor } from '../../models/rest/AssetModel';
import { CollectModel } from '../../models/rest/CollectModel';
import { CustomCollectionModel } from '../../models/rest/CustomCollectionModel';
import { SmartCollectionModel } from '../../models/rest/SmartCollectionModel';
import { CollectionRow } from '../../schemas/CodaRows.types';
import { CollectionSyncTableSchema } from '../../schemas/syncTable/CollectionSchema';
import { SyncTableRestContinuation } from '../../sync/rest/AbstractSyncedRestResources';
import { SyncedCollections } from '../../sync/rest/SyncedCollections';
import { MetafieldOwnerType } from '../../types/admin.types';
import { makeDeleteRestResourceAction, makeFetchSingleRestResourceAction } from '../../utils/coda-utils';
import { getCollectionType, getCollectionTypes } from '../../utils/collections-utils';
import { graphQlGidToId, idToGraphQlGid } from '../../utils/conversion-utils';
import { assertAllowedValue, isNullishOrEmpty } from '../../utils/helpers';
import { CodaMetafieldSetNew } from '../CodaMetafieldSetNew';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';

// #endregion

// #region Helper functions
function createSyncedCustomCollections(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext
) {
  return new SyncedCollections({
    context,
    codaSyncParams,
    model: CustomCollectionModel,
    client: CustomCollectionClient.createInstance(context),
    validateSyncParams,
    validateSyncUpdate,
  });
}
function createSyncedSmartCollections(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext
) {
  return new SyncedCollections({
    context,
    codaSyncParams,
    model: SmartCollectionModel,
    client: SmartCollectionClient.createInstance(context),
    validateSyncParams,
    validateSyncUpdate,
  });
}

function validateSyncParams({ published_status }: { published_status?: string }) {
  const invalidMsg: string[] = [];
  if (
    !isNullishOrEmpty(published_status) &&
    !assertAllowedValue(published_status, optionValues(OPTIONS_PUBLISHED_STATUS))
  ) {
    invalidMsg.push(`publishedStatus: ${published_status}`);
  }
  if (invalidMsg.length) {
    throw new InvalidValueVisibleError(invalidMsg.join(', '));
  }
}

function validateSyncUpdate(prevRow: CollectionRow, newRow: CollectionRow) {
  if (
    !isNullishOrEmpty(newRow.image_alt_text) &&
    isNullishOrEmpty(newRow.image_url) &&
    isNullishOrEmpty(prevRow.image_url)
  ) {
    throw new coda.UserVisibleError("Collection image url can't be empty if image_alt_text is set");
  }
}

async function getCollectionClientFromId({ id, context }: { id: number; context: coda.ExecutionContext }) {
  const collectionType = await getCollectionType(idToGraphQlGid(GraphQlResourceNames.Collection, id), context);
  const client =
    collectionType === RestResourcesSingular.SmartCollection
      ? SmartCollectionClient.createInstance(context)
      : CustomCollectionClient.createInstance(context);
  const model = collectionType === RestResourcesSingular.SmartCollection ? SmartCollectionModel : CustomCollectionModel;
  return { client, model };
}

async function separateCollectionUpdates(
  updates: Array<coda.SyncUpdate<string, string, typeof this._schemaCache.items>>,
  context: coda.UpdateSyncExecutionContext
) {
  const gids = updates.map(({ previousValue }) =>
    idToGraphQlGid(GraphQlResourceNames.Collection, previousValue.id as number)
  );
  const collectionTypes = await getCollectionTypes(gids, context);
  const filterUpdatesByType = (type: string) => {
    const typeIds = collectionTypes.filter(({ type: t }) => t === type).map(({ id }) => graphQlGidToId(id));
    return updates.filter(({ previousValue }) => typeIds.includes(previousValue.id as number));
  };

  return {
    customCollectionsUpdates: filterUpdatesByType(RestResourcesSingular.CustomCollection),
    smartCollectionsUpdates: filterUpdatesByType(RestResourcesSingular.SmartCollection),
  };
}
// #endregion

// #region Sync tables
export const Sync_Collections = coda.makeSyncTable({
  name: 'Collections',
  description:
    'Return Collections from this shop. A collection is a grouping of products that merchants can create to make their stores easier to browse. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Collection,
  schema: SyncedCollections.staticSchema,
  dynamicOptions: {
    getSchema: async (context, _, formulaContext) =>
      SyncedCollections.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] }),
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'template_suffix') {
        return getTemplateSuffixesFor({ kind: 'collection', context });
      }
    },
  },
  formula: {
    name: 'SyncCollections',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedCollections.codaParamsMap}
     */
    parameters: [
      { ...filters.general.syncMetafields, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.general.publishedAtRange, optional: true },

      { ...filters.general.handle, optional: true },
      { ...filters.collection.idArray, optional: true },
      { ...filters.product.id, name: 'productId', optional: true },

      { ...filters.general.publishedStatus, optional: true },
      { ...filters.general.title, optional: true },
    ],
    execute: async (codaSyncParams, context) => {
      const { CustomCollection: custom } = RestResourcesSingular;
      const prevContinuation = context?.sync?.continuation as SyncTableRestContinuation;
      const singular: RestResourceSingular = prevContinuation?.extraData?.currResourceName ?? custom;
      const createSyncedResourcesFunction =
        singular === custom ? createSyncedCustomCollections : createSyncedSmartCollections;

      let { result, continuation } = await createSyncedResourcesFunction(codaSyncParams, context).executeSync();
      /** On a terminé la synchro des custom collections, on passe à la synchro des smart */
      if (!continuation && singular === custom) {
        continuation = {
          skipNextRestSync: 'false',
          hasLock: 'true',
          extraData: {
            currResourceName: RestResourcesSingular.SmartCollection,
          },
        };
      }
      return { result, continuation };
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) => {
      const { customCollectionsUpdates, smartCollectionsUpdates } = await separateCollectionUpdates(updates, context);
      const syncUpdateJobs = [
        customCollectionsUpdates.length
          ? createSyncedCustomCollections(codaSyncParams, context).executeSyncUpdate(customCollectionsUpdates)
          : undefined,
        smartCollectionsUpdates.length
          ? createSyncedSmartCollections(codaSyncParams, context).executeSyncUpdate(smartCollectionsUpdates)
          : undefined,
      ].filter(Boolean);

      const results = await Promise.all(syncUpdateJobs);
      return { result: results.flatMap((r) => r.result) };
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
    const customCollectionRow: CollectionRow = {
      id: undefined,
      title,
      body_html,
      handle,
      published: published ?? defaultPublishedStatus,
      template_suffix,
      image_url,
      image_alt_text,
    };
    const customCollection = CustomCollectionModel.createInstanceFromRow(context, customCollectionRow);
    if (metafields) {
      customCollection.data.metafields = CodaMetafieldSetNew.createGraphQlMetafieldsFromCodaParameterArray(context, {
        codaParams: metafields,
        ownerType: MetafieldOwnerType.Collection,
      });
    }
    validateSyncUpdate({} as CollectionRow, customCollectionRow);
    await customCollection.save();
    return customCollection.data.id;
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
    const { model } = await getCollectionClientFromId({ id: collectionId as number, context });
    const collectionRow: CollectionRow = {
      id: collectionId,
      body_html: bodyHtml,
      handle,
      published,
      template_suffix: templateSuffix,
      title,
      image_alt_text: imageAlt,
      image_url: imageUrl,
    };

    const collection = model.createInstanceFromRow(context, collectionRow);
    if (metafields) {
      collection.data.metafields = CodaMetafieldSetNew.createGraphQlMetafieldsFromCodaParameterArray(context, {
        codaParams: metafields,
        ownerType: MetafieldOwnerType.Collection,
        ownerGid: collection.graphQlGid,
      });
    }

    validateSyncUpdate({} as CollectionRow, collectionRow);
    await collection.save();
    return collection.toCodaRow();
  },
});

export const Action_DeleteCollection = makeDeleteRestResourceAction({
  modelName: PACK_IDENTITIES.Collection,
  IdParameter: inputs.collection.id,
  execute: async ([itemId], context) => {
    const { client } = await getCollectionClientFromId({ id: itemId as number, context });
    await client.delete({ id: itemId as number });
    return true;
  },
});

export const Action_AddProductToCollection = coda.makeFormula({
  name: 'AddProductToCollection',
  description:
    "Add a Product to a Custom ('manual') Collection. You can't add a product to a Smart ('automated') Collection.",
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.product.id,
    { ...inputs.collection.id, description: 'The ID of the custom collection that will contain the product.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async ([product_id, collection_id], context) => {
    const collect = CollectModel.createInstanceFromRow(context, {
      id: undefined,
      collection_id,
      product_id,
    });
    await collect.save();
    return collect.data.id;
  },
});
// #endregion

// #region Formulas
export const Formula_Collection = makeFetchSingleRestResourceAction({
  modelName: CustomCollectionModel.displayName,
  IdParameter: inputs.collection.id,
  schema: SyncedCollections.staticSchema,
  execute: async ([itemId], context) => {
    const { client, model } = await getCollectionClientFromId({ id: itemId as number, context });
    const response = await client.single({ id: itemId as number });
    // @ts-expect-error
    return model.createInstance(context, response.body).toCodaRow();
  },
});

export const Format_Collection: coda.Format = {
  name: 'Collection',
  instructions: 'Paste the collection ID into the column.',
  formulaName: 'Collection',
};
// #endregion
