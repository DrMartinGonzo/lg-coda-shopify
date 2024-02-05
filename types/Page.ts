import { MetafieldRestInput } from './Metafields';

// export interface PageSyncTableRestParams {
//   fields?: string;
//   limit?: number;
//   handle?: string;
//   // published_status?: string;
//   // status?: string;
//   // ids?: string;
//   // product_type?: string;
//   // vendor?: string;
//   // created_at_min?: Date | string;
//   // created_at_max?: Date | string;
//   // updated_at_min?: Date | string;
//   // updated_at_max?: Date | string;
//   // published_at_min?: Date | string;
//   // published_at_max?: Date | string;
// }

export interface PageUpdateRestParams {
  handle?: string;
  published?: boolean;
  published_at?: string;
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
  published_at?: string;
  body_html?: string;
  author?: string;
  template_suffix?: string;
  metafields?: MetafieldRestInput[];
}
