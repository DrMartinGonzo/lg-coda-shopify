import type { BlogRow } from '../CodaRows';
import type { MetafieldRestInput } from '../../types/Metafields';
import type { BaseSyncTableRestParams } from '../../types/RequestsRest';

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

    interface Update {
      title?: string;
      handle?: string;
      commentable?: string;
      template_suffix?: string;
      metafields?: MetafieldRestInput[];
    }

    interface Create {
      title: string;
      handle?: string;
      commentable?: string;
      template_suffix?: string;
      metafields?: MetafieldRestInput[];
    }
  }
}
