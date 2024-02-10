import * as coda from '@codahq/packs-sdk';
import { REST_DEFAULT_API_VERSION } from '../constants';
import { makeGetRequest } from '../helpers-rest';

export async function autocompleteTemplateSuffixParameter(
  kind: string,
  context: coda.ExecutionContext,
  search: string,
  args: any
) {
  const templateSuffixes = await getTemplateSuffixesFor(kind, context);
  return coda.simpleAutocomplete(search, templateSuffixes);
}

export async function getActiveTheme(context: coda.ExecutionContext) {
  const themesResponse = await fetchThemesRest(context);
  if (themesResponse) {
    const themes = themesResponse.body.themes;
    return themes.find((theme) => theme.role === 'main');
  }
}

export function fetchThemesRest(context: coda.ExecutionContext) {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/themes.json`;
  return makeGetRequest({ url }, context);
}

export function fetchThemeAssetsRest(theme_id: number, context: coda.ExecutionContext) {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/themes/${theme_id}/assets.json`;
  return makeGetRequest({ url }, context);
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
