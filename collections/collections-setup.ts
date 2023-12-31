import * as coda from '@codahq/packs-sdk';

import {
  CollectSchema,
  CollectionSchema,
  CustomCollectionSchema,
  ProductIdsCollectionSchema,
  ProductInCollectionSchema,
  SmartCollectionSchema,
} from './collections-schema';
import {
  fetchAllCollects,
  fetchAllCustomCollections,
  fetchAllSmartCollections,
  fetchCollect,
  fetchCollection,
  fetchCustomCollection,
  fetchProductIdsInCollections,
  fetchProductsInCollection,
  fetchSmartCollection,
} from './collections-functions';

import { IDENTITY_CUSTOM_COLLECTION, OPTIONS_PUBLISHED_STATUS } from '../constants';
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
          type: coda.ParameterType.Number,
          name: 'since_id',
          description: 'Return only products after the specified ID.',
          optional: true,
        }),
      ],
      execute: fetchAllCollects,
    },
  });

  pack.addSyncTable({
    name: 'ProductIdsInCollection',
    description: 'Retrieve a list of products IDs belonging to a collection.',
    identityName: 'ProductIdInCollection',
    schema: ProductIdsCollectionSchema,
    formula: {
      name: 'SyncProductIdsInCollection',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'id',
          description: 'The id of the collection.',
        }),
        sharedParameters.maxEntriesPerRun,
      ],
      execute: fetchProductIdsInCollections,
    },
  });

  pack.addSyncTable({
    name: 'ProductsInCollection',
    description: 'All products belonging to a specified collection id.',
    identityName: 'ProductInCollection',
    schema: ProductInCollectionSchema,
    formula: {
      name: 'SyncProductsInCollection',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'id',
          description: 'The id of the collection.',
        }),
        sharedParameters.maxEntriesPerRun,
      ],
      execute: fetchProductsInCollection,
    },
  });

  pack.addSyncTable({
    name: 'CustomCollections',
    description: 'All custom Collections.',
    identityName: IDENTITY_CUSTOM_COLLECTION,
    schema: CustomCollectionSchema,
    formula: {
      name: 'SyncCustomCollections',
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
      execute: fetchAllCustomCollections,
    },
  });

  pack.addSyncTable({
    name: 'SmartCollections',
    description: 'All SmartCollections.',
    identityName: 'SmartCollection',
    schema: SmartCollectionSchema,
    formula: {
      name: 'SyncSmartCollections',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'handle',
          description: 'Filter results by smart collection handle.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'ids',
          description: 'Show only the smart collections specified by a comma-separated list of IDs.',
          optional: true,
        }),
        sharedParameters.maxEntriesPerRun,
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'product_id',
          description: 'Show smart collections that includes the specified product.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'published_at_max',
          description: 'Show smart collections published before this date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'published_at_min',
          description: 'Show smart collections published after this date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'published_status',
          description: 'Filter results based on the published status of smart collections.',
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
          description: 'Show smart collections with the specified title.',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_max',
          description: 'Show smart collections last updated before this date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Date,
          name: 'updated_at_min',
          description: 'Show smart collections last updated after this date. (format: 2014-04-25T16:15:47-04:00)',
          optional: true,
        }),
      ],
      execute: fetchAllSmartCollections,
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Collect',
    description: 'Get a single collect data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'collectID',
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
    schema: CollectSchema,
    execute: fetchCollect,
  });

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

  pack.addFormula({
    name: 'CustomCollection',
    description: 'Get a single Custom Collection data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'customCollectionID',
        description: 'The id of the custom collection.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'fields',
        description: 'Show only certain fields, specified by a comma-separated list of field names.',
        optional: true,
      }),
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: CustomCollectionSchema,
    execute: fetchCustomCollection,
  });

  pack.addFormula({
    name: 'SmartCollection',
    description: 'Get a single smart collect data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'smartCollectionID',
        description: 'The id of the smart collection.',
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
    schema: SmartCollectionSchema,
    execute: fetchSmartCollection,
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'Collect',
    instructions: 'Get a single collect data.',
    formulaName: 'Collect',
  });
  pack.addColumnFormat({
    name: 'Collection',
    instructions: 'Get a single collection data.',
    formulaName: 'Collection',
  });
  pack.addColumnFormat({
    name: 'CustomCollection',
    instructions: 'Get a single custom collection data.',
    formulaName: 'CustomCollection',
  });
  pack.addColumnFormat({
    name: 'SmartCollection',
    instructions: 'Get a single smart collection data.',
    formulaName: 'SmartCollection',
  });
};
