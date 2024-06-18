// #region Imports

import { safeToFloat } from '../../utils/helpers';
import { OrderLineItemApiData } from '../rest/OrderLineItemModel';

// #endregion

export function formatOrderLineItemPropertyForDraftOrder({
  price_set,
  total_discount_set,
  ...line
}: OrderLineItemApiData) {
  return {
    ...line,
    price: safeToFloat(line.price),
  };
}
export function formatOrderLineItemPropertyForOrder({ price_set, total_discount_set, ...line }: OrderLineItemApiData) {
  return {
    ...line,
    price: safeToFloat(line.price),
    total_discount: safeToFloat(line.total_discount),
  };
}
