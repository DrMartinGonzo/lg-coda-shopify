import * as coda from '@codahq/packs-sdk';

import { CollectSchema, CollectionSchema } from './collections-schema';
import { fetchAllCollections, fetchAllCollects, fetchCollection, updateCollection } from './collections-functions';

import { IDENTITY_COLLECTION, OPTIONS_PUBLISHED_STATUS } from '../constants';
import { sharedParameters } from '../shared-parameters';

export const setupCollections = (pack) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Collects',
    description: 'All collect.',
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
      execute: fetchAllCollects,
    },
  });

  pack.addSyncTable({
    name: 'Collections',
    description: 'All Collections.',
    identityName: IDENTITY_COLLECTION,
    schema: CollectionSchema,
    formula: {
      name: 'SyncCollections',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'handle',
          description: 'Filter results by custom collection handle.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'ids',
          description: 'Show only collections specified by a comma-separated list of IDs.',
          optional: true,
        }),
        sharedParameters.maxEntriesPerRun,
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'product_id',
          description: 'Show custom collections that includes the specified product.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'published_at_max',
          description: 'Show custom collections published before this date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'published_at_min',
          description: 'Show custom collections published after this date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'published_status',
          description: 'Filter results based on the published status of custom collections.',
          optional: true,
          autocomplete: OPTIONS_PUBLISHED_STATUS,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'since_id',
          description: 'Restrict results to after the specified ID.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'title',
          description: 'Show custom collections with the specified title.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_max',
          description: 'Show custom collections last updated before this date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_min',
          description: 'Show custom collections last updated after this date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
      ],
      execute: fetchAllCollections,
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
          return {
            ...newValues,
            ...update.newValue,
          };
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
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Collection',
    description: 'Get a single collection data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'collectionID',
        description: 'The id of the collection.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'fields',
        description: 'Retrieve only certain fields, specified by a comma-separated list of fields names.',
        optional: true,
      }),
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: CollectionSchema,
    execute: fetchCollection,
  });

  // TODO: finish adding all updatable parameters
  pack.addFormula({
    name: 'UpdateCollection',
    description: 'Update collection.',

    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'collectionGid',
        description: 'The GraphQL GID of the collection.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'body_html',
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
        name: 'template_suffix',
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
      return await updateCollection(collectionGid, { body_html, handle, template_suffix, published }, context);
    },
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'Collection',
    instructions: 'Get a single collection data.',
    formulaName: 'Collection',
  });
};
