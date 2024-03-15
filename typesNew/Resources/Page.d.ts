import type { PageRow } from '../CodaRows';
import type { BaseSyncTableRestParams } from '../allResources';
import type { Metafield } from '../../typesNew/Resources/Metafield';

export declare namespace Page {
  type Row = PageRow;

  namespace Params {
    interface Sync extends BaseSyncTableRestParams {
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

    interface Create {
      title: string;
      handle?: string;
      published?: boolean;
      published_at?: Date;
      body_html?: string;
      author?: string;
      template_suffix?: string;
      metafields?: Metafield.Params.RestInput[];
    }

    interface Update {
      handle?: string;
      published?: boolean;
      published_at?: Date;
      title?: string;
      body_html?: string;
      author?: string;
      template_suffix?: string;
      metafields?: Metafield.Params.RestInput[];
    }
  }
}
