import * as coda from '@codahq/packs-sdk';

export const sharedParameters = {
  maxEntriesPerRun: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'maxEntriesPerRun',
    description:
      'How many entries do we fetch each run. (max: 250) (all entries will always be fetched, this is just to adjust if Shopify complains about Query cost)',
    optional: true,
  }),
};
