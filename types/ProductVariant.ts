import type { MetafieldRestInput } from './Metafields';

export interface ProductVariantUpdateRestParams {
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

export interface ProductVariantCreateRestParams {
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
  metafields?: MetafieldRestInput[];
}
