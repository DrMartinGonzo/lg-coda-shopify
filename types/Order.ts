import { MetafieldRestInput } from './Metafields';

export interface OrderSyncTableRestParams {
  fields?: string;
  limit?: number;
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

export interface OrderUpdateRestParams {
  note?: string;
  email?: string;
  phone?: string;
  buyer_accepts_marketing?: boolean;
  tags?: string;
}
export interface OrderCreateRestParams {
  note?: string;
  email?: string;
  phone?: string;
  buyer_accepts_marketing?: boolean;
  tags?: string;
}
