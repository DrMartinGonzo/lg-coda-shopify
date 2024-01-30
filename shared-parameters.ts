import * as coda from '@codahq/packs-sdk';
import { autocompleteBlogGidParameter } from './articles/articles-functions';
import { OPTIONS_PRODUCT_STATUS_REST, OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_LIMIT } from './constants';
import { autocompleteProductTypes } from './products/products-functions';

export const sharedParameters = {
  maxEntriesPerRun: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'maxEntriesPerRun',
    description: `How many entries do we fetch each run. (max: ${REST_DEFAULT_LIMIT}) (all entries will always be fetched, this is just to adjust if Shopify complains about Query cost)`,
    optional: true,
  }),

  blog_gid: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'blogGid',
    description: 'The GraphQL GID of the blog.',
    autocomplete: autocompleteBlogGidParameter,
  }),
  optionalSyncMetafields: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'syncMetafields',
    description: 'Also retrieve metafields (slower sync)',
    optional: true,
  }),
  metafieldValue: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'metafieldValue',
    description: 'The metafield value.',
  }),

  productId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'productId',
    description: 'The Id of the product.',
  }),
  productType: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'productType',
    description: 'The product type.',
    autocomplete: autocompleteProductTypes,
  }),
  productTypes: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'productTypes',
    description: 'Filter results by product types.',
    autocomplete: autocompleteProductTypes,
  }),
  productVendor: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'vendor',
    description: 'The product vendor.',
  }),
  productVendors: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'vendors',
    description: 'Return products by product vendors.',
  }),
  productStatusRest: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'status',
    description: 'The status of the product.',
    autocomplete: OPTIONS_PRODUCT_STATUS_REST,
  }),
  productSingleStatusRest: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'status',
    description: 'The status of the product.',
    autocomplete: OPTIONS_PRODUCT_STATUS_REST,
  }),
  productPublishedStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'publishedStatus',
    description: 'The product published status.',
    autocomplete: OPTIONS_PUBLISHED_STATUS,
  }),
  productIds: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'productIds',
    description: 'Return only products specified by a comma-separated list of product IDs or GraphQL GIDs.',
  }),

  varArgsPropValue: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'value',
    description: 'The property value.',
  }),

  /**====================================================================================================================
   *    Filters
   *===================================================================================================================== */
  filterCreatedAtMax: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'createdAtMax',
    description: 'Filter results created before this date.',
  }),
  filterCreatedAtMin: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'createdAtMin',
    description: 'Filter results created after this date.',
  }),
  filterCreatedAtRange: coda.makeParameter({
    type: coda.ParameterType.DateArray,
    name: 'createdAt',
    description: 'Filter results created in the given date range.',
  }),
  filterFields: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fields',
    description: 'Comma-separated list of fields names to retrieve. Retrieve all fields if blank.',
  }),
  filterHandle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'handle',
    description: 'Filter results by handle.',
  }),
  filterHandles: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'handles',
    description: 'Filter results by comma separated list of handles.',
  }),
  filterIds: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'ids',
    description: 'Filter results by comma-separated list of IDs.',
  }),
  filterProductId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'productId',
    description: 'Filter results that include the specified product.',
  }),
  filterPublishedAtMax: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'publishedAtMax',
    description: 'Filter results published before this date.',
  }),
  filterPublishedAtMin: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'publishedAtMin',
    description: 'Filter results published after this date.',
  }),
  filterPublishedAtRange: coda.makeParameter({
    type: coda.ParameterType.DateArray,
    name: 'publishedAt',
    description: 'Filter results published in the given date range.',
  }),
  filterPublishedStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'publishedStatus',
    description: 'Filter results by the published status.',
    autocomplete: OPTIONS_PUBLISHED_STATUS,
  }),
  filterSinceId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'sinceId',
    description: 'Filter results created after the specified ID.',
  }),
  filterTitle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'Filter results by specified title.',
  }),
  filterUpdatedAtMax: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'updatedAtMax',
    description: 'Filter results last updated before this date.',
  }),
  filterUpdatedAtMin: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'updatedAtMin',
    description: 'Filter results last updated after this date.',
  }),
  filterUpdatedAtRange: coda.makeParameter({
    type: coda.ParameterType.DateArray,
    name: 'updatedAt',
    description: 'Filter results updated in the given date range.',
  }),
};
