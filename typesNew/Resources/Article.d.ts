import type { ArticleRow } from '../CodaRows';
import type { MetafieldRestInput } from '../../types/Metafields';
import type { BaseSyncTableRestParams } from '../../types/RequestsRest';

export declare namespace Article {
  type Row = ArticleRow;

  namespace Params {
    interface Sync extends BaseSyncTableRestParams {
      fields?: string;
      author?: string;
      tag?: string;
      created_at_max?: Date;
      created_at_min?: Date;
      handle?: string;
      published_at_max?: Date;
      published_at_min?: Date;
      published_status?: string;
      updated_at_max?: Date;
      updated_at_min?: Date;
    }

    interface Update {
      author?: string;
      blog_id?: number;
      body_html?: string;
      handle?: string;
      image?: {
        alt?: string;
        src?: string;
      };
      published_at?: Date;
      published?: boolean;
      summary_html?: string;
      tags?: string;
      template_suffix?: string;
      title?: string;
    }

    interface Create {
      blog_id: number;

      author?: string;
      body_html?: string;
      handle?: string;
      image?: {
        src: string;
        alt?: string;
      };
      metafields?: MetafieldRestInput[];
      published_at?: Date;
      published?: boolean;
      summary_html?: string;
      tags?: string;
      template_suffix?: string;
      title?: string;
    }
  }
}
