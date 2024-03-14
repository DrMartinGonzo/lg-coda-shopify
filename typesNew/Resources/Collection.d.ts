import type { CollectionRow } from '../CodaRows';
import type { MetafieldRestInput } from '../../types/Metafields';
import type { BaseSyncTableRestParams } from '../../types/RequestsRest';

export declare namespace Collection {
  type Row = CollectionRow;

  namespace Params {
    interface Sync extends BaseSyncTableRestParams {
      fields?: string;
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

    interface Update {
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

    interface Create {
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
  }
}
