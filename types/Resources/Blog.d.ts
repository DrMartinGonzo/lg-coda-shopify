import type { BlogRow } from '../CodaRows';
import type { Metafield } from './Metafield';
import type { BaseSyncTableRestParams } from '../allResources';

export declare namespace Blog {
  type Row = BlogRow;

  namespace Params {
    interface Sync extends BaseSyncTableRestParams {
      fields?: string;
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

    interface Create {
      title: string;
      handle?: string;
      commentable?: string;
      template_suffix?: string;
      metafields?: Metafield.Params.RestInput[];
    }

    interface Update {
      title?: string;
      handle?: string;
      commentable?: string;
      template_suffix?: string;
      metafields?: Metafield.Params.RestInput[];
    }
  }
}
