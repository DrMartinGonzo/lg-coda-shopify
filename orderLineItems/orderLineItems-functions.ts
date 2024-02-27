import * as coda from '@codahq/packs-sdk';
import { formatOrderReferenceValueForSchema } from '../schemas/syncTable/OrderSchema';
import { formatProductVariantReferenceValueForSchema } from '../schemas/syncTable/ProductVariantSchema';

// #region Formatting functions
export const formatOrderLineItemForSchemaFromRestApi = (orderLineItem, parentOrder, context) => {
  let obj: any = {
    ...orderLineItem,
    order_id: parentOrder.id,
    order: formatOrderReferenceValueForSchema(parentOrder.id, parentOrder.name),
    variant: formatProductVariantReferenceValueForSchema(orderLineItem.variant_id, orderLineItem.variant_title),
  };

  return obj;
};
// #endregion
