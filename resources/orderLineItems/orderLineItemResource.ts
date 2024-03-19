import { OrderLineItemSyncTableSchema } from '../../schemas/syncTable/OrderLineItemSchema';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { OrderLineItemRow } from '../../schemas/CodaRows.types';
import { Resource } from '../Resource.types';
import { OrderSyncRestParams } from '../orders/orderResource';

// #region Rest Parameters
interface OrderLineItemSyncRestParams extends OrderSyncRestParams {}
// #endregion

export type OrderLineItem = Resource<{
  codaRow: OrderLineItemRow;
  schema: typeof OrderLineItemSyncTableSchema;
  params: {
    sync: OrderLineItemSyncRestParams;
  };
  rest: {
    singular: RestResourceSingular.Order;
    plural: RestResourcePlural.Order;
  };
}>;

export const orderLineItemResource = {
  display: 'Order Line Item',
  schema: OrderLineItemSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Order,
  },
  rest: {
    singular: RestResourceSingular.Order,
    plural: RestResourcePlural.Order,
  },
} as OrderLineItem;
