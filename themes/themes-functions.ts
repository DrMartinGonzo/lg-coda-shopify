import * as coda from '@codahq/packs-sdk';
import { REST_DEFAULT_API_VERSION } from '../constants';
import { makeGetRequest } from '../helpers-rest';
import { FetchRequestOptions } from '../types/Requests';

// #region Autocomplete
export function makeAutocompleteTemplateSuffixesFor(kind: string) {
  return async function (context: coda.ExecutionContext, search: string, args: any) {
    return getTemplateSuffixesFor(kind, context);
  };
}
export async function getTemplateSuffixesFor(kind: string, context: coda.ExecutionContext): Promise<string[]> {
  const activeTheme = await getActiveTheme(context);
  if (activeTheme) {
    const assetsResponse = await fetchThemeAssetsRest(activeTheme.id, context);
    if (assetsResponse && assetsResponse.body.assets) {
      const regex = new RegExp(`templates\\\/${kind}\\.(.*)\\.`, '');

      return assetsResponse.body.assets
        .map((asset) => asset.key)
        .map((key) => {
          const match = key.match(regex);
          return match ? match[1] : null;
        })
        .filter((group) => group !== null);
    }
  }

  return [];
}
// #endregion

// #region Helpers
async function getActiveTheme(context: coda.ExecutionContext) {
  const themesResponse = await fetchThemesRest(context);
  if (themesResponse) {
    const themes = themesResponse.body.themes;
    return themes.find((theme) => theme.role === 'main');
  }
}
// #endregion

// #region Rest requests
function fetchThemesRest(context: coda.ExecutionContext, requestOptions: FetchRequestOptions = {}) {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/themes.json`;
  return makeGetRequest({ ...requestOptions, url }, context);
}

function fetchThemeAssetsRest(
  theme_id: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/themes/${theme_id}/assets.json`;
  return makeGetRequest({ ...requestOptions, url }, context);
}
// #endregion
