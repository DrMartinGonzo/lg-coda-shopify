import type { BaseSyncTableRestParams } from './RequestsRest';

export interface RedirectSyncTableRestParams extends BaseSyncTableRestParams {
  fields: string;
  path?: string;
  target?: string;
}

export interface RedirectCreateRestParams {
  path: string;
  target: string;
}

export interface RedirectUpdateRestParams {
  path?: string;
  target?: string;
}
