import { MetafieldRestInput } from './Metafields';

export interface CollectionSyncTableRestParams {
  fields?: string;
  limit?: number;
  ids?: string;
  handle?: string;
  product_id?: number;
  title?: string;
  published_status?: string;
  created_at_min?: Date;
  created_at_max?: Date;
  updated_at_min?: Date;
  updated_at_max?: Date;
  published_at_min?: Date;
  published_at_max?: Date;
}

export interface CollectionUpdateRestParams {
  title?: string;
  body_html?: string;
  handle?: string;
  image?: {
    alt?: string;
    src?: string;
  };
  published?: boolean;
  template_suffix?: string;
  metafields?: MetafieldRestInput[];
}
export interface CollectionCreateRestParams {
  title: string;
  body_html?: string;
  handle?: string;
  image?: {
    src: string;
    alt?: string;
  };
  published?: boolean;
  template_suffix?: string;
  metafields?: MetafieldRestInput[];
}
