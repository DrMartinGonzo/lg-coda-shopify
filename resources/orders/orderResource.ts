import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { OrderRow } from '../../schemas/CodaRows.types';
import { OrderSyncTableSchema } from '../../schemas/syncTable/OrderSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { ResourceSyncRestParams, ResourceUpdateRestParams, ResourceWithMetafieldDefinitions } from '../Resource.types';

// #region Rest Parameters
export interface OrderSyncRestParams extends ResourceSyncRestParams {
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

interface OrderUpdateRestParams extends ResourceUpdateRestParams {
  note?: string;
  email?: string;
  phone?: string;
  buyer_accepts_marketing?: boolean;
  tags?: string;
}
// #endregion

const orderResourceBase = {
  display: 'Order',
  schema: OrderSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Order,
    singular: 'order',
    plural: 'orders',
  },
  rest: {
    singular: RestResourceSingular.Order,
    plural: RestResourcePlural.Order,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Order,
    useGraphQl: true,
    hasSyncTable: true,
    supportsDefinitions: true,
  },
} as const;

export type Order = ResourceWithMetafieldDefinitions<
  typeof orderResourceBase,
  {
    codaRow: OrderRow;
    rest: {
      params: {
        sync: OrderSyncRestParams;
        update: OrderUpdateRestParams;
      };
    };
  }
>;
export const orderResource = orderResourceBase as Order;
