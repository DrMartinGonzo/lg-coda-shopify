import { MetafieldRestInput } from './Metafields';
// TODO: all

export interface CollectionSyncTableRestParams {
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

export interface CollectionUpdateRestParams {
  title?: string;
  body_html?: string;
  handle?: string;
  image_url?: string;
  image_alt_text?: string;
  published?: boolean;
  template_suffix?: string;
  metafields?: MetafieldRestInput[];
}
export interface CollectionCreateRestParams {
  title: string;
  body_html?: string;
  handle?: string;
  image_url?: string;
  image_alt_text?: string;
  published?: boolean;
  template_suffix?: string;
  metafields?: MetafieldRestInput[];
}
