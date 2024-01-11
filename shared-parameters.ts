import * as coda from '@codahq/packs-sdk';
import { autocompleteBlogGidParameter } from './articles/articles-functions';
import { OPTIONS_PUBLISHED_STATUS, REST_DEFAULT_LIMIT } from './constants';

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
