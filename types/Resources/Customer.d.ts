import type { CustomerRow } from '../CodaRows';
import type { Metafield } from './Metafield';
import type { BaseSyncTableRestParams } from '../allResources';

export declare namespace Customer {
  type Row = CustomerRow;

  namespace Params {
    interface Sync extends BaseSyncTableRestParams {
      fields: string;
      ids?: string;
      created_at_min?: Date;
      created_at_max?: Date;
      updated_at_min?: Date;
      updated_at_max?: Date;
    }

    interface Create {
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
      metafields?: Metafield.Params.RestInput[];
    }

    interface Update {
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
  }
}
