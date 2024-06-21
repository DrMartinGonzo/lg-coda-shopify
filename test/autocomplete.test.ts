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
import { pack } from '../pack';
import { MetafieldOwnerType } from '../types/admin.types';
import { formatOptionNameId } from '../utils/helpers';
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

    expect(result[0].value).toEqual(formatOptionNameId('Vitest location', 74534912256));
  });

  test('Blogs', async () => {
    const result = await executeMetadataFormula(
      wrapMetadataFunction(autocompleteBlogParameterWithName),
      { search: 'Vitest' },
      context
    );

    expect(result[0].value).toEqual(formatOptionNameId('Vitest', 91627159808));
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
