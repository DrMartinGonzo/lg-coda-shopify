import type { MetafieldRestInput } from './Metafields';

export interface ProductSyncTableRestParams {
  fields?: string;
  limit?: number;
  published_status?: string;
  status?: string;
  handle?: string;
  ids?: string;
  product_type?: string;
  vendor?: string;
  created_at_min?: Date | string;
  created_at_max?: Date | string;
  updated_at_min?: Date | string;
  updated_at_max?: Date | string;
  published_at_min?: Date | string;
  published_at_max?: Date | string;
}

export interface ProductUpdateRestParams {
  title?: string;
  body_html?: string;
  product_type?: string;
  tags?: string;
  vendor?: string;
  status?: string;
  handle?: string;
  template_suffix?: string;
}

export interface ProductCreateRestParams {
  title?: string;
  body_html?: string;
  product_type?: string;
  options?: {
    name: string;
    values: string[];
  }[];
  tags?: string;
  vendor?: string;
  status?: string;
  handle?: string;
  images?: { src: string }[];
  variants?: {
    option1: string;
    option2: string;
    option3: string;
  }[];
  template_suffix?: string;
  metafields?: MetafieldRestInput[];
}
