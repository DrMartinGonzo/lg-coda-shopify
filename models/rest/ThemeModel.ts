// #region Imports

import { BaseApiDataRest, BaseModelDataRest } from './AbstractModelRest';

// #endregion

// #region Types
export interface ThemeApiData extends BaseApiDataRest {
  created_at: string | null;
  name: string | null;
  previewable: boolean | null;
  processing: boolean | null;
  role: string | null;
  src: string | null;
  theme_store_id: number | null;
  updated_at: string | null;
}

interface ThemeModelData extends BaseModelDataRest, ThemeApiData {}
// #endregion
