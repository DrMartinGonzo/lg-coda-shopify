import type { ProductRow } from '../CodaRows';
import type { BaseSyncTableRestParams } from '../allResources';
import type { Metafield } from './Metafield';

export declare namespace Product {
  type Row = ProductRow;

  namespace Params {
    interface Sync extends BaseSyncTableRestParams {
      fields?: string;
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

    interface Create {
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
      metafields?: Metafield.Params.RestInput[];
    }

    interface Update {
      title?: string;
      body_html?: string;
      product_type?: string;
      tags?: string;
      vendor?: string;
      status?: string;
      handle?: string;
      template_suffix?: string;
    }
  }
}
