// #region Imports
import * as coda from '@codahq/packs-sdk';

import { Asset } from '../../Resources/Rest/Asset';
import { CustomCollection } from '../../Resources/Rest/CustomCollection';
import { MergedCollection } from '../../Resources/Rest/MergedCollection';
import { FromRow } from '../../Resources/types/Resource.types';
import { PACK_IDENTITIES } from '../../constants';
import { CollectionRow } from '../../schemas/CodaRows.types';
import { CollectionSyncTableSchema } from '../../schemas/syncTable/CollectionSchema';
import { makeDeleteRestResourceAction, makeFetchSingleRestResourceAction } from '../../utils/coda-utils';
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
     *  - {@link Collection_Smart.makeSyncTableManagerSyncFunction}
     *  - {@link CustomCollection.makeSyncTableManagerSyncFunction}
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
    execute: async (params, context) => MergedCollection.sync(params, context),
    maxUpdateBatchSize: 10,
    executeUpdate: async (params, updates, context) => MergedCollection.syncUpdate(params, updates, context),
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
        .map((s) => s.toMetafield({ context, owner_resource: MergedCollection.metafieldRestOwnerType })
      ),
    };

    // Only supports creating Custom Collections
    const newCustomCollection = new CustomCollection({ context, fromRow });
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
        .map((s) => s.toMetafield({ context, owner_id: collectionId, owner_resource: MergedCollection.metafieldRestOwnerType })
      ),
    };

    const updatedCollection = new MergedCollection({ context, fromRow });
    await updatedCollection.saveAndUpdate();
    return updatedCollection.formatToRow();
  },
});

export const Action_DeleteCollection = makeDeleteRestResourceAction(MergedCollection, inputs.collection.id);
// #endregion

// #region Formulas
export const Formula_Collection = makeFetchSingleRestResourceAction(MergedCollection, inputs.collection.id);

export const Format_Collection: coda.Format = {
  name: 'Collection',
  instructions: 'Paste the collection ID into the column.',
  formulaName: 'Collection',
};

// #endregion
