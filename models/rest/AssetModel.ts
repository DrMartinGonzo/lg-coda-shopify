// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FetchRequestOptions } from '../../Clients/Client.types';
import { AssetClient, ThemeClient } from '../../Clients/RestClients';
import { RestResourceSingular } from '../types/SupportedResource';
import { CACHE_DEFAULT } from '../../constants';
import { BaseApiDataRest, BaseModelDataRest } from './AbstractModelRest';

// #endregion

// #region Types
export interface AssetApiData extends BaseApiDataRest {
  attachment: string | null;
  checksum: string | null;
  content_type: string | null;
  created_at: string | null;
  key: string | null;
  public_url: string | null;
  size: number | null;
  theme_id: number | null;
  updated_at: string | null;
  value: string | null;
}

export interface AssetModelData extends BaseModelDataRest, AssetApiData {}
// #endregion

export async function getTemplateSuffixesFor({
  context,
  kind,
}: {
  context: coda.ExecutionContext;
  kind: RestResourceSingular;
}): Promise<string[]> {
  const options: FetchRequestOptions = { cacheTtlSecs: CACHE_DEFAULT };

  const themeClient = ThemeClient.createInstance(context);
  const activeTheme = await themeClient.active({ fields: 'id,role', options });

  // const activeTheme = await Theme.findActive({ context, fields: 'id,role', options });
  if (activeTheme?.body) {
    const assetClient = AssetClient.createInstance(context);
    const assets = await assetClient.list({ theme_id: activeTheme.body.id, fields: 'key', options });

    if (assets?.body.length) {
      const regex = new RegExp(`templates\\\/${kind}\\.(.*)\\.`, '');
      return assets.body
        .map((asset) => asset.key)
        .map((key) => {
          const match = key.match(regex);
          return match ? match[1] : null;
        })
        .filter(Boolean);
    }
  }

  return [];
}
