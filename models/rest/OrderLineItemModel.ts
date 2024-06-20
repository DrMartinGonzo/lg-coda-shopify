// #region Imports

import { OrderLineItemClient } from '../../Clients/RestClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { OrderLineItemRow } from '../../schemas/CodaRows.types';
import { TypeFromCodaSchema } from '../../schemas/Schema.types';
import { OrderLineItemSchema } from '../../schemas/basic/OrderLineItemSchema';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { formatOrderLineItemPropertyForOrder } from '../utils/orders-utils';
import { AbstractModelRest, BaseApiDataRest } from './AbstractModelRest';
import { DutyApiData, PriceSetApiData } from './OrderModel';

// #endregion

// #region Types
export interface OrderLineItemApiData extends BaseApiDataRest, TypeFromCodaSchema<typeof OrderLineItemSchema> {
  duties: DutyApiData[] | null;
  price_set: PriceSetApiData;
  total_discount_set: PriceSetApiData;
}

export interface OrderLineItemModelData extends OrderLineItemApiData {
  order_id: number;
  order_name: string;
}
// #endregion

export class OrderLineItemModel extends AbstractModelRest {
  public data: OrderLineItemModelData;
  public static readonly displayName: Identity = PACK_IDENTITIES.OrderLineItem;

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return OrderLineItemClient.createInstance(this.context);
  }

  public toCodaRow(): OrderLineItemRow {
    const { data } = this;
    const obj: OrderLineItemRow = {
      ...formatOrderLineItemPropertyForOrder(data),
      order: formatOrderReference(data.order_id, data.order_name),
      variant: formatProductVariantReference(data.variant_id, data.variant_title),
    };
    return obj as OrderLineItemRow;
  }
}
