import * as coda from '@codahq/packs-sdk';

// #region Helpers
// TODO
export function validateOrderLineItemParams(params) {
  return true;
}
// #endregion

// #region Formatting functions
export const formatOrderLineItemForSchemaFromRestApi = (orderLineItem, parentOrder, context) => {
  let obj: any = {
    ...orderLineItem,
    order_id: parentOrder.id,
    order: {
      id: parentOrder.id,
      name: parentOrder.name,
    },
    variant: {
      id: orderLineItem.variant_id,
      title: orderLineItem.variant_title,
    },
  };

  return obj;
};
// #endregion
