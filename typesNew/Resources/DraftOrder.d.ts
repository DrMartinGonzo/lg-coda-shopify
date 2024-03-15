import type { DraftOrderRow } from '../CodaRows';
import type { BaseSyncTableRestParams } from '../allResources';

export declare namespace DraftOrder {
  type Row = DraftOrderRow;

  namespace Params {
    interface Sync extends BaseSyncTableRestParams {
      fields?: string;
      ids?: string;
      since_id?: number;
      status?: string;
      updated_at_min?: Date;
      updated_at_max?: Date;
    }

    interface Update {
      note?: string;
      email?: string;
      tags?: string;
    }

    interface Complete {
      payment_gateway_id?: number;
      /** true: The resulting order will be unpaid and can be captured later. false: The resulting order will be marked as paid through either the default or specified gateway. */
      payment_pending?: Boolean;
    }

    interface SendInvoice {
      /** The email address that will populate the to field of the email. */
      to?: string;
      /** The email address that will populate the from field of the email. */
      from?: string;
      /** The list of email addresses to include in the bcc field of the email. Emails must be associated with staff accounts on the shop. Email address must be validated by Shopify. */
      bcc?: string[];
      /** The email subject. */
      subject?: string;
      /** The custom message displayed in the email. */
      custom_message?: string;
    }
  }
}
