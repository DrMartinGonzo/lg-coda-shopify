import type { ProductVariantRow } from '../CodaRows';
import type { Metafield } from '../../typesNew/Resources/Metafield';
import type { Product } from './Product';

export declare namespace ProductVariant {
  type Row = ProductVariantRow;

  namespace Params {
    interface Sync extends Product.Params.Sync {}

    interface Create {
      product_id: number;
      option1: string;
      option2?: string;
      option3?: string;
      price?: number;
      sku?: string;
      position?: number;
      taxable?: boolean;
      barcode?: string;
      compare_at_price?: number;
      weight?: number;
      weight_unit?: string;
      metafields?: Metafield.Params.RestInput[];
    }

    interface Update {
      option1?: string;
      option2?: string;
      option3?: string;
      price?: number;
      sku?: string;
      position?: number;
      taxable?: boolean;
      barcode?: string;
      compare_at_price?: number;
      weight?: number;
      weight_unit?: string;
    }
  }
}
