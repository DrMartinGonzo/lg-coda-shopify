import * as coda from '@codahq/packs-sdk';

import { CollectSchema, CollectionSchema } from './collections-schema';
import {
  syncCollections,
  syncCollects,
  fetchCollection,
  updateCollection,
  deleteCollection,
  createCollection,
} from './collections-functions';

import { IDENTITY_COLLECTION, OPTIONS_PUBLISHED_STATUS } from '../constants';
import { sharedParameters } from '../shared-parameters';

const parameters = {
  collectionGID: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'collectionGid',
    description: 'The GraphQL GID of the collection.',
  }),
};

export const setupCollections = (pack) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Collects',
    description: 'Return Collects from this shop. The Collect resource connects a product to a custom collection.',
    identityName: 'Collect',
    schema: CollectSchema,
    formula: {
      name: 'SyncProductsInCollection',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        sharedParameters.maxEntriesPerRun,
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'collection_gid',
          description: 'Retrieve only collects for a certain collection identified by its graphQL GID.',
          optional: true,
        }),
      ],
      execute: syncCollects,
    },
  });

  pack.addSyncTable({
    name: 'Collections',
    description:
      'Return Collectionss from this shop. A collection is a grouping of products that merchants can create to make their stores easier to browse.',
    identityName: IDENTITY_COLLECTION,
    schema: CollectionSchema,
    formula: {
      name: 'SyncCollections',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        { ...sharedParameters.filterHandle, optional: true },
        { ...sharedParameters.filterIds, optional: true },
        { ...sharedParameters.filterProductId, optional: true },
        { ...sharedParameters.filterPublishedAtMax, optional: true },
        { ...sharedParameters.filterPublishedAtMin, optional: true },
        { ...sharedParameters.filterPublishedStatus, optional: true },
        { ...sharedParameters.filterSinceId, optional: true },
        { ...sharedParameters.filterTitle, optional: true },
        { ...sharedParameters.filterUpdatedAtMax, optional: true },
        { ...sharedParameters.filterUpdatedAtMin, optional: true },
      ],
      execute: syncCollections,
      maxUpdateBatchSize: 10,
      executeUpdate: async function (args, updates, context: coda.SyncExecutionContext) {
        const jobs = updates.map(async (update) => {
          const { updatedFields } = update;
          // console.log('updatedFields', updatedFields);
          // console.log('update.previousValue', update.previousValue);
          const collectionGid = update.previousValue.admin_graphql_api_id;

          const fields = {};
          updatedFields.forEach((key) => {
            fields[key] = update.newValue[key];
          });
          const newValues = await updateCollection(collectionGid, fields, context);
          return newValues;
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

  /**====================================================================================================================
   *    Actions
   *===================================================================================================================== */
  // TODO: finish adding all updatable parameters
  pack.addFormula({
    name: 'UpdateCollection',
    description: 'Update an existing Shopify collection and return the updated data.',

    parameters: [
      parameters.collectionGID,
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'bodyHtml',
        description: 'The description of the collection, including any HTML tags and formatting.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'handle',
        description: 'A unique string that identifies the collection.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'templateSuffix',
        description: 'The suffix of the Liquid template being used to show the collection in an online store.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'title',
        description: 'The name of the collection.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.Boolean,
        name: 'published',
        description: 'The published status of the collection on the online store.',
        optional: true,
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    schema: coda.withIdentity(CollectionSchema, IDENTITY_COLLECTION),
    execute: async ([collectionGid, body_html, handle, template_suffix, title, published], context) => {
      return await updateCollection(collectionGid, { body_html, handle, template_suffix, published, title }, context);
    },
  });

  pack.addFormula({
    name: 'CreateCollection',
    description: `Create a new Shopify Collection and return GraphQl GID.`,

    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'title',
        description: 'The name of the collection.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'handle',
        description: 'A unique string that identifies the collection.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'bodyHtml',
        description: 'The description of the collection, including any HTML tags and formatting.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'templateSuffix',
        description: 'The suffix of the Liquid template being used to show the collection in an online store.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.Boolean,
        name: 'published',
        description: 'The published status of the collection on the online store.',
        optional: true,
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async ([title, handle, body_html, template_suffix, published], context) => {
      const response = await createCollection(
        {
          title,
          handle,
          body_html,
          template_suffix,
          published,
        },
        context
      );
      const { body } = response;
      return body.custom_collection.admin_graphql_api_id;
    },
  });

  // an action to delete a collection
  pack.addFormula({
    name: 'DeleteCollection',
    description: 'Delete an existing Shopify Collection and return true on success.',
    parameters: [parameters.collectionGID],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async function ([collectionGid], context) {
      await deleteCollection([collectionGid], context);
      return true;
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Collection',
    description: 'Return a single collection from this shop.',
    parameters: [
      parameters.collectionGID,
      //! field filter Doesn't seem to work
      // { ...sharedParameters.filterFields, optional: true }
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: CollectionSchema,
    execute: fetchCollection,
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'Collection',
    instructions: 'Paste the GraphQL GID of the collection into the column.',
    formulaName: 'Collection',
  });
};
