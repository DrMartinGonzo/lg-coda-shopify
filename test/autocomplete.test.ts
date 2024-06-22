// #region Imports

import * as coda from '@codahq/packs-sdk';
import { wrapMetadataFunction } from '@codahq/packs-sdk/dist/api';
import { executeMetadataFormula, newRealFetcherExecutionContext } from '@codahq/packs-sdk/dist/development';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  autocompleteBlogParameterWithName,
  autocompleteLocationsWithName,
  makeAutocompleteMetafieldKeysWithDefinitions,
} from '../coda/utils/coda-parameters';
import { graphQlGidToId } from '../graphql/utils/graphql-utils';
import { pack } from '../pack';
import { MetafieldOwnerType } from '../types/admin.types';
import { formatOptionNameId } from '../utils/helpers';
import { referenceIds } from './utils/test-utils';
import { manifestPath } from './utils/test-utils';

// #endregion

describe('INTEGRATION: Autocomplete', () => {
  let context: coda.ExecutionContext;

  beforeEach(() => {
    context = newRealFetcherExecutionContext(pack, manifestPath);
  });

  test('Locations', async () => {
    const result = await executeMetadataFormula(
      wrapMetadataFunction(autocompleteLocationsWithName),
      { search: 'Vitest' },
      context
    );

    expect(result[0].value).toEqual(formatOptionNameId('Vitest location', graphQlGidToId(referenceIds.sync.location)));
  });

  test('Blogs', async () => {
    const result = await executeMetadataFormula(
      wrapMetadataFunction(autocompleteBlogParameterWithName),
      { search: 'Vitest' },
      context
    );

    expect(result[0].value).toEqual(formatOptionNameId('Vitest', referenceIds.sync.blog));
  });

  test('MetafieldWithDefinitionFullKeys', async () => {
    const result = await executeMetadataFormula(
      wrapMetadataFunction(makeAutocompleteMetafieldKeysWithDefinitions(MetafieldOwnerType.Product)),
      { search: 'global.description_tag' },
      context
    );

    expect(result[0].value).toEqual('global.description_tag');
  });
});
