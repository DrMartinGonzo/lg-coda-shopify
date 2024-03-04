import type { MetafieldRestInput } from './Metafields';

export interface BlogSyncTableRestParams {
  fields?: string;
  limit?: number;
  handle?: string;
  // published_status?: string;
  // status?: string;
  // ids?: string;
  // product_type?: string;
  // vendor?: string;
  // created_at_min?: Date | string;
  // created_at_max?: Date | string;
  // updated_at_min?: Date | string;
  // updated_at_max?: Date | string;
  // published_at_min?: Date | string;
  // published_at_max?: Date | string;
}

export interface BlogUpdateRestParams {
  title?: string;
  handle?: string;
  commentable?: string;
  template_suffix?: string;
  metafields?: MetafieldRestInput[];
}
export interface BlogCreateRestParams {
  title: string;
  handle?: string;
  commentable?: string;
  template_suffix?: string;
  metafields?: MetafieldRestInput[];
}
