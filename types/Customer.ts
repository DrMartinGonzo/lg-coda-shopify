import type { MetafieldRestInput } from './Metafields';

export interface CustomerSyncTableRestParams {
  fields: string;
  limit: number;
  ids?: string;
  created_at_min?: Date;
  created_at_max?: Date;
  updated_at_min?: Date;
  updated_at_max?: Date;
}

export interface CustomerCreateRestParams {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  note?: string;
  tags?: string;
  email_marketing_consent?: {
    state: string;
    opt_in_level?: string;
  };
  sms_marketing_consent?: {
    state: string;
    opt_in_level?: string;
  };
  metafields?: MetafieldRestInput[];
}

export interface CustomerUpdateRestParams {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  note?: string;
  tags?: string;
  accepts_email_marketing?: Boolean;
  accepts_sms_marketing?: Boolean;
  email_marketing_consent?: {
    state: string;
    opt_in_level?: string;
  };
  sms_marketing_consent?: {
    state: string;
    opt_in_level?: string;
  };
}
