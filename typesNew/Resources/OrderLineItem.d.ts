import type { OrderLineItemRow } from '../CodaRows';
import { Order } from './Order';

export declare namespace OrderLineItem {
  type Row = OrderLineItemRow;

  namespace Params {
    interface Sync extends Order.Params.Sync {}
  }
}
