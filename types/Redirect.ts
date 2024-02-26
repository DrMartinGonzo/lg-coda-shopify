export interface RedirectSyncRestParams {
  fields: string;
  limit: number;
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
