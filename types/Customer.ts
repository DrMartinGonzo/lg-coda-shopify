import { MetafieldRestInput } from './Metafields';

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

// TODO: we need an interface for Coda Update and an interface for Rest Update
