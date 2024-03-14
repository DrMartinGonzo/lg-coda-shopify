import type { MetafieldRestInput } from './Metafields';
import type { BaseSyncTableRestParams } from './RequestsRest';

export interface PageSyncTableRestParams extends BaseSyncTableRestParams {
  fields?: string;
  handle?: string;
  since_id?: number;
  title?: string;
  published_status?: string;
  created_at_min?: Date;
  created_at_max?: Date;
  updated_at_min?: Date;
  updated_at_max?: Date;
  published_at_min?: Date;
  published_at_max?: Date;
}

export interface PageUpdateRestParams {
  handle?: string;
  published?: boolean;
  published_at?: Date;
  title?: string;
  body_html?: string;
  author?: string;
  template_suffix?: string;
  metafields?: MetafieldRestInput[];
}
export interface PageCreateRestParams {
  title: string;
  handle?: string;
  published?: boolean;
  published_at?: Date;
  body_html?: string;
  author?: string;
  template_suffix?: string;
  metafields?: MetafieldRestInput[];
}
