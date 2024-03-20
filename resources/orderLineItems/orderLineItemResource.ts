import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { OrderLineItemRow } from '../../schemas/CodaRows.types';
import { OrderLineItemSyncTableSchema } from '../../schemas/syncTable/OrderLineItemSchema';
import { Resource } from '../Resource.types';
import { OrderSyncRestParams } from '../orders/orderResource';

// #region Rest Parameters
interface OrderLineItemSyncRestParams extends OrderSyncRestParams {}
// #endregion

const orderLineItemResourceBase = {
  display: 'Order Line Item',
  schema: OrderLineItemSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Order,
  },
  rest: {
    singular: RestResourceSingular.Order,
    plural: RestResourcePlural.Order,
  },
} as const;

export type OrderLineItem = Resource<
  typeof orderLineItemResourceBase,
  {
    codaRow: OrderLineItemRow;
    rest: {
      params: {
        sync: OrderLineItemSyncRestParams;
      };
    };
  }
>;
export const orderLineItemResource = orderLineItemResourceBase as OrderLineItem;
