export interface DraftOrderSyncTableRestParams {
  fields?: string;
  ids?: string;
  limit: number;
  since_id?: number;
  status?: string;
  updated_at_min?: Date;
  updated_at_max?: Date;
}

export interface DraftOrderUpdateRestParams {
  note?: string;
  email?: string;
  tags?: string;
}
