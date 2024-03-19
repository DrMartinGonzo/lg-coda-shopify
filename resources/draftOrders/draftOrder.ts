import { DraftOrderSyncTableSchema } from '../../schemas/syncTable/DraftOrderSchema';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { DraftOrderRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import {
  ResourceSyncRestParams,
  ResourceUpdateRestParams,
  ResourceWithMetafieldDefinitionsNew,
} from '../Resource.types';

// #region Rest Parameters
interface DraftOrderSyncRestParams extends ResourceSyncRestParams {
  fields?: string;
  ids?: string;
  since_id?: number;
  status?: string;
  updated_at_min?: Date;
  updated_at_max?: Date;
}
interface DraftOrderUpdateRestParams extends ResourceUpdateRestParams {
  note?: string;
  email?: string;
  tags?: string;
}
interface DraftOrderCompleteRestParams {
  payment_gateway_id?: number;
  /** true: The resulting order will be unpaid and can be captured later. false: The resulting order will be marked as paid through either the default or specified gateway. */
  payment_pending?: Boolean;
}
interface DraftOrderSendInvoiceRestParams {
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
// #endregion

export type DraftOrder = ResourceWithMetafieldDefinitionsNew<{
  codaRow: DraftOrderRow;
  schema: typeof DraftOrderSyncTableSchema;
  params: {
    sync: DraftOrderSyncRestParams;
    update: DraftOrderUpdateRestParams;
    complete: DraftOrderCompleteRestParams;
    sendInvoice: DraftOrderSendInvoiceRestParams;
  };
  rest: {
    singular: RestResourceSingular.DraftOrder;
    plural: RestResourcePlural.DraftOrder;
  };
  metafields: {
    ownerType: MetafieldOwnerType.Draftorder;
  };
}>;

export const draftOrderResource = {
  display: 'Draft Order',
  schema: DraftOrderSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.DraftOrder,
    singular: 'draftOrder',
    plural: 'draftOrders',
  },
  rest: {
    singular: RestResourceSingular.DraftOrder,
    plural: RestResourcePlural.DraftOrder,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Draftorder,
    useGraphQl: true,
    hasSyncTable: true,
    supportsDefinitions: true,
  },
} as DraftOrder;
