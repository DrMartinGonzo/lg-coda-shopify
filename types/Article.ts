import { MetafieldRestInput } from './Metafields';

export interface ArticleSyncTableRestParams {
  fields?: string;
  limit?: number;
  author?: string;
  tag?: string;
  created_at_max?: string;
  created_at_min?: string;
  handle?: string;
  published_at_max?: string;
  published_at_min?: string;
  published_status?: string;
  updated_at_max?: string;
  updated_at_min?: string;
}

export interface ArticleUpdateRestParams {
  author?: string;
  blog_id?: number;
  body_html?: string;
  handle?: string;
  // TODO: see if we can update the image src
  image?: {
    alt?: string;
    src?: string;
  };
  published_at?: string;
  published?: boolean;
  summary_html?: string;
  tags?: string;
  template_suffix?: string;
  title?: string;
}

export interface ArticleCreateRestParams {
  blog_id: number;

  author?: string;
  body_html?: string;
  handle?: string;
  image?: {
    src: string;
    alt?: string;
  };
  metafields?: MetafieldRestInput[];
  published_at?: string;
  published?: boolean;
  summary_html?: string;
  tags?: string;
  template_suffix?: string;
  title?: string;
}
