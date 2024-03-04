import type { MetafieldRestInput } from './Metafields';

// export interface ProductVariantSyncTableRestParams {
//   fields?: string;
//   limit?: number;
//   published_status?: string;
//   status?: string;
//   handle?: string;
//   ids?: string;
//   product_type?: string;
//   vendor?: string;
//   created_at_min?: Date | string;
//   created_at_max?: Date | string;
//   updated_at_min?: Date | string;
//   updated_at_max?: Date | string;
//   published_at_min?: Date | string;
//   published_at_max?: Date | string;
// }

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
