import * as coda from '@codahq/packs-sdk';
import { getRestBaseUrl, makeGetRequest } from '../helpers-rest';

import type { RestResources } from '../typesNew/ShopifyRestResourceTypes';
import type { FetchRequestOptions } from '../typesNew/Fetcher';

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
    if (assetsResponse?.body?.assets) {
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
  if (themesResponse?.body?.themes) {
    return themesResponse.body.themes.find((theme) => theme.role === 'main');
  }
}
// #endregion

// #region Rest requests
function fetchThemesRest(context: coda.ExecutionContext, requestOptions: FetchRequestOptions = {}) {
  const url = coda.joinUrl(getRestBaseUrl(context), 'themes.json');
  return makeGetRequest<{ themes: RestResources['Theme'][] }>({ ...requestOptions, url }, context);
}

function fetchThemeAssetsRest(
  theme_id: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) {
  const url = coda.joinUrl(getRestBaseUrl(context), `themes/${theme_id}/assets.json`);
  return makeGetRequest<{ assets: RestResources['Asset'][] }>({ ...requestOptions, url }, context);
}
// #endregion
