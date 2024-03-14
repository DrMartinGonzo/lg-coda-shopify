import type { BaseSyncTableRestParams } from './RequestsRest';

export interface OrderSyncTableRestParams extends BaseSyncTableRestParams {
  fields?: string;
  handle?: string;
  ids?: string;
  financial_status?: string;
  fulfillment_status?: string;
  status?: string;
  since_id?: number;
  created_at_min?: Date;
  created_at_max?: Date;
  updated_at_min?: Date;
  updated_at_max?: Date;
  processed_at_min?: Date;
  processed_at_max?: Date;
}

export interface OrderUpdateRestParams {
  note?: string;
  email?: string;
  phone?: string;
  buyer_accepts_marketing?: boolean;
  tags?: string;
}
