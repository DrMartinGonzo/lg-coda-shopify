import * as coda from '@codahq/packs-sdk';
import { RestClientWithGraphQlMetafields } from '../../Fetchers/Client/Rest/RestClientWithSchemaWithGraphQlMetafields';
import {
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
} from '../../constants';
import { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { formatCustomerReference } from '../../schemas/syncTable/CustomerSchema';
import { formatAddressDisplayName, formatPersonDisplayValue } from '../../utils/helpers';
import { Order, orderResource } from './orderResource';

export class OrderRestFetcher extends RestClientWithGraphQlMetafields<Order> {
  constructor(context: coda.ExecutionContext) {
    super(orderResource, context);
  }

  validateParams = (params: any) => {
    if (params.status) {
      const validStatuses = OPTIONS_ORDER_STATUS;
      (Array.isArray(params.status) ? params.status : [params.status]).forEach((status) => {
        if (!validStatuses.includes(status)) throw new coda.UserVisibleError('Unknown status: ' + params.status);
      });
    }
    if (params.financial_status) {
      const validStatuses = OPTIONS_ORDER_FINANCIAL_STATUS;
      (Array.isArray(params.financial_status) ? params.financial_status : [params.financial_status]).forEach(
        (financial_status) => {
          if (!validStatuses.includes(financial_status))
            throw new coda.UserVisibleError('Unknown financial status: ' + params.financial_status);
        }
      );
    }
    if (params.fulfillment_status) {
      const validStatuses = OPTIONS_ORDER_FULFILLMENT_STATUS;
      (Array.isArray(params.fulfillment_status) ? params.fulfillment_status : [params.fulfillment_status]).forEach(
        (fulfillment_status) => {
          if (!validStatuses.includes(fulfillment_status))
            throw new coda.UserVisibleError('Unknown fulfillment status: ' + params.fulfillment_status);
        }
      );
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<Order['codaRow']>,
    metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet> = []
  ): Order['rest']['params']['update'] | undefined => {
    let restParams: Order['rest']['params']['update'] = {};

    if (row.buyer_accepts_marketing !== undefined) restParams.buyer_accepts_marketing = row.buyer_accepts_marketing;
    if (row.email !== undefined) restParams.email = row.email;
    if (row.note !== undefined) restParams.note = row.note;
    if (row.tags !== undefined) restParams.tags = row.tags;

    // TODO if we implement Order Create
    /*
    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restParams = { ...restParams, metafields: metafieldRestInputs } as OrderCreateRestParams;
    }
    */
    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (order): Order['codaRow'] => {
    let obj: Order['codaRow'] = {
      ...order,
      admin_url: `${this.context.endpoint}/admin/orders/${order.id}`,
    };

    if (order.customer) {
      obj.customer = formatCustomerReference(
        order.customer.id,
        formatPersonDisplayValue({
          id: order.customer.id,
          firstName: order.customer.first_name,
          lastName: order.customer.last_name,
          email: order.customer.email,
        })
      );
    }
    if (order.billing_address) {
      obj.billing_address = {
        display: formatAddressDisplayName(order.billing_address),
        ...order.billing_address,
      };
    }
    if (order.shipping_address) {
      obj.shipping_address = {
        display: formatAddressDisplayName(order.shipping_address),
        ...order.shipping_address,
      };
    }
    if (order.current_total_duties_set) {
      obj.current_total_duties = order.current_total_duties_set?.shop_money?.amount;
    }
    if (order.current_total_additional_fees_set) {
      obj.current_total_additional_fees = order.current_total_additional_fees_set?.shop_money?.amount;
    }
    if (order.original_total_additional_fees_set) {
      obj.original_total_additional_fees = order.original_total_additional_fees_set?.shop_money?.amount;
    }
    if (order.original_total_duties_set) {
      obj.original_total_duties = order.original_total_duties_set?.shop_money?.amount;
    }
    if (order.total_shipping_price_set) {
      obj.total_shipping_price = order.total_shipping_price_set?.shop_money?.amount;
    }
    if (order.client_details) {
      obj.browser_user_agent = order.client_details?.user_agent;
      obj.browser_accept_language = order.client_details?.accept_language;
    }
    if (order.refunds) {
      obj.refunds = order.refunds.map((refund) => {
        return {
          ...refund,
          transactions: refund.transactions.map((transaction) => {
            return {
              id: transaction.id,
              label: transaction.label,
              amount: transaction.amount,
              createdAt: transaction.created_at,
              currency: transaction.currency,
              errorCode: transaction.error_code,
              gateway: transaction.gateway,
              kind: transaction.kind,
              parentTransactionId: transaction.parent_id,
              paymentId: transaction.payment_id,
              processedAt: transaction.processed_at,
              status: transaction.status,
              test: transaction.test,
              totalUnsettled: transaction.total_unsettled_set?.shop_money?.amount,
            };
          }),
        };
      });
    }
    if (order.line_items) {
      obj.line_items = order.line_items.map((line_item) => {
        return {
          ...line_item,
          // variant: formatProductReferenceValueForSchema(line_item.variant_id),
        };
      });
    }

    return obj;
  };
}
