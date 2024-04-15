// #region Improts
import * as coda from '@codahq/packs-sdk';

import { Asset } from '../Resources/Rest/Asset';
import { Theme } from '../Resources/Rest/Theme';

// #endregion

export async function getTemplateSuffixesFor(kind: string, context: coda.ExecutionContext): Promise<string[]> {
  const activeThemeNew = await Theme.findActive({ context, fields: 'id,role' });

  if (activeThemeNew) {
    const assets = await Asset.all({ theme_id: activeThemeNew.apiData.id, fields: 'key', context });
    if (assets.data.length) {
      const regex = new RegExp(`templates\\\/${kind}\\.(.*)\\.`, '');

      return assets.data
        .map((asset) => asset.apiData.key)
        .map((key) => {
          const match = key.match(regex);
          return match ? match[1] : null;
        })
        .filter(Boolean);
    }
  }

  return [];
}

// #endregion
