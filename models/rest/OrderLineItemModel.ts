// #region Imports

import { OrderLineItemClient } from '../../Clients/RestClients';
import { TypeFromCodaSchemaProps } from '../../schemas/Schema.types';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { OrderLineItemRow } from '../../schemas/CodaRows.types';
import { OrderLineItemSchema } from '../../schemas/basic/OrderLineItemSchema';
import { formatOrderReference } from '../../schemas/syncTable/OrderSchema';
import { formatProductVariantReference } from '../../schemas/syncTable/ProductVariantSchema';
import { AbstractModelRest, BaseApiDataRest } from './AbstractModelRest';
import { Duty } from './OrderModel';

// #endregion

// #region Types
export type OrderLineItemApiData = BaseApiDataRest &
  TypeFromCodaSchemaProps<(typeof OrderLineItemSchema)['properties']> & {
    duties: Duty[] | null;
  };

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
    return {
      ...data,
      order_id: data.order_id,
      order: formatOrderReference(data.order_id, data.order_name),
      variant: formatProductVariantReference(data.variant_id, data.variant_title),
    };
  }
}
