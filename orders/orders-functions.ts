// #region Imports
/**
 * Imported defintions from gas-coda-export-bills package
 */
/// <reference path="../node_modules/gas-coda-export-bills/Interfaces.d.ts"/>

import * as coda from '@codahq/packs-sdk';

import { OPTIONS_ORDER_FINANCIAL_STATUS, OPTIONS_ORDER_FULFILLMENT_STATUS, OPTIONS_ORDER_STATUS } from '../constants';
import { convertTTCtoHT, handleFieldDependencies } from '../helpers';

import { formatCustomerDisplayValue } from '../customers/customers-functions';
import { formatAddressDisplayName } from '../addresses/addresses-functions';
import { formatCustomerReference } from '../schemas/syncTable/CustomerSchema';
import { SimpleRestNew } from '../Fetchers/SimpleRest';
import { orderFieldDependencies } from '../schemas/syncTable/OrderSchema';
import { cleanQueryParams } from '../helpers-rest';
import { SyncTableRestNew } from '../Fetchers/SyncTableRest';

import type { Order } from '../typesNew/Resources/Order';
import type { CodaMetafieldKeyValueSet } from '../helpers-setup';
import type { SyncTableParamValues } from '../Fetchers/SyncTableRest';
import type { Sync_Orders } from './orders-setup';
import type { SyncTableType } from '../types/SyncTable';
import { OrderLineItemSyncTableType } from '../orderLineItems/orderLineItems-functions';
import { orderResource } from '../allResources';

// #region Class
export type OrderSyncTableType = SyncTableType<
  typeof orderResource,
  Order.Row,
  Order.Params.Sync,
  never,
  Order.Params.Update
>;

export class OrderSyncTable<
  T extends OrderSyncTableType | OrderLineItemSyncTableType = OrderSyncTableType
> extends SyncTableRestNew<T> {
  constructor(fetcher: OrderRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(orderResource, fetcher, params);
  }

  setSyncParams() {
    const [
      status = 'any',
      syncMetafields,
      created_at,
      updated_at,
      processed_at,
      financial_status,
      fulfillment_status,
      ids,
      since_id,
    ] = this.codaParams as SyncTableParamValues<typeof Sync_Orders>;
    console.log('this.effectiveStandardFromKeys', this.effectiveStandardFromKeys);
    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, orderFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
      ids: ids && ids.length ? ids.join(',') : undefined,
      financial_status,
      fulfillment_status,
      status,
      since_id,
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
      processed_at_min: processed_at ? processed_at[0] : undefined,
      processed_at_max: processed_at ? processed_at[1] : undefined,
    });
  }
}

export class OrderRestFetcher extends SimpleRestNew<OrderSyncTableType> {
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
    row: Partial<Order.Row>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Order.Params.Update | undefined => {
    let restParams: Order.Params.Update = {};

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

  formatApiToRow = (order): Order.Row => {
    let obj: Order.Row = {
      ...order,
      admin_url: `${this.context.endpoint}/admin/orders/${order.id}`,
    };

    if (order.customer) {
      obj.customer = formatCustomerReference(order.customer.id, formatCustomerDisplayValue(order.customer));
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

// #endregion

// #region Helpers
function getItemRefundLineItems(refunds, line_item_id) {
  let refund_line_items = [];
  refunds.forEach((refund) => {
    refund_line_items = refund_line_items.concat(
      refund.refund_line_items.filter((r) => r.line_item_id === line_item_id)
    );
  });

  return refund_line_items;
}

function getRefundQuantity(item, refunds) {
  let quantity = 0;
  const refund_line_items = getItemRefundLineItems(refunds, item.id);
  if (refund_line_items.length) {
    quantity = refund_line_items.reduce((prev, curr) => {
      prev - curr.quantity;
    }, quantity);
  }

  return quantity;
}
// #endregion

// #region Formatting functions
export const formatOrderForDocExport = (order) => {
  const discountApplications = order.discount_applications;
  const refunds = order.refunds;
  const items: SheetExport.Invoice.Item[] = [];

  discountApplications.forEach((discountApplication, index) => {
    const collectedAmounts = [];
    order.line_items.forEach((item) => {
      const taxRate = item.tax_lines[0]?.rate;
      const quantityAfterRefunds = item.quantity - getRefundQuantity(item, refunds);

      if (quantityAfterRefunds > 0) {
        item.discount_allocations.forEach((discountAllocation) => {
          if (discountAllocation.discount_application_index === index) {
            collectedAmounts.push({
              amount: parseFloat(discountAllocation.amount),
              tax: taxRate,
            });
          }
        });
      }
    });

    if (collectedAmounts.length) {
      let name = '';
      switch (discountApplication.type) {
        case 'discount_code':
          name = discountApplication.code;
          break;
        case 'manual':
          name = 'réduction manuelle';
          break;

        default:
          name = discountApplication.title ?? discountApplication.type;
          break;
      }

      const uniqueTaxes = collectedAmounts
        .map((amount) => amount.tax)
        .filter((value, index, array) => array.indexOf(value) == index);
      if (uniqueTaxes.length) {
        uniqueTaxes.forEach((tax) => {
          items.push({
            name,
            price: collectedAmounts
              .filter((a) => a.tax === tax)
              .reduce((prev, curr) => prev + convertTTCtoHT(curr.amount, tax), 0),
            quantity: -1,
            tax: tax ?? null,
            discount_type: discountApplication.type,
          });
        });
      } else {
        items.push({
          name,
          price: collectedAmounts.reduce((prev, curr) => prev + curr.amount, 0),
          quantity: -1,
          tax: null,
          discount_type: discountApplication.type,
        });
      }
    }
  });

  let refundedShippingAmount = 0;
  let refundedShippingTaxAmount = 0;

  if (refunds.length) {
    const refundedShipping = order.refunds.flatMap((refund) => {
      return refund.order_adjustments.filter((order_adjustment) => {
        return order_adjustment.kind === 'shipping_refund';
      });
    });

    if (refundedShipping.length) {
      refundedShippingAmount = Math.abs(
        refundedShipping.reduce((previous, current) => {
          return previous + parseFloat(current.amount);
        }, 0)
      );
      refundedShippingTaxAmount = Math.abs(
        refundedShipping.reduce((previous, current) => {
          return previous + parseFloat(current.tax_amount);
        }, 0)
      );
    }
  }

  order.line_items.forEach((data) => {
    const taxRate = data.tax_lines[0]?.rate;
    const quantityAfterRefunds = data.quantity - getRefundQuantity(data, refunds);

    items.push({
      name: data.title + (data.variant_title ? ' - ' + data.variant_title : ''),
      price: convertTTCtoHT(parseFloat(data.price), taxRate),
      quantity: quantityAfterRefunds ?? 0,
      tax: taxRate,
    });
  });

  // Refunds not linked to a specific line item
  // Pour le moment, on ajoute le remboursement avec une TVA de 0,
  // TODO: le mieux serait de checker si les produits avec tel taux de taxe ont
  // une somme suffisante pour couvrir l'intégralité du remboursement et
  // appliquer cete taxe au remboursement. SInon il faudrait splitter entre les
  // taxes.

  // Remarque de Francys : "Mais, bon, applique le taux de TA que tu veux au
  // remboursement, à condition que dans la facture il y ait pour 20 € de
  // produit avec de la TVA à 20 % ou 20 € de TVA à 5,5 % ce qui revient
  // finalement à faire une réduction… HT avec de la TVA…"

  // TODO: L'idéal si le client a acheté 20 € de produits avec TVA à 5,5% serait d'émette un avoir (une facture avec des moins...) de 47,39 € HT / 2,61 TVA : 20 € TTC
  let refundDiscrepancyAmount = 0;
  if (refunds.length) {
    const refundedDiscrepancy = order.refunds.flatMap((refund) => {
      return refund.order_adjustments.filter((order_adjustment) => {
        return order_adjustment.kind === 'refund_discrepancy';
      });
    });

    if (refundedDiscrepancy.length) {
      refundDiscrepancyAmount = Math.abs(
        refundedDiscrepancy.reduce((previous, current) => {
          return previous + parseFloat(current.amount);
        }, 0)
      );
    }
  }
  if (refundDiscrepancyAmount > 0) {
    items.push({
      name: 'Remboursement',
      price: refundDiscrepancyAmount,
      quantity: -1,
      tax: 0,
    });
  }

  const shipping: SheetExport.Invoice.ShippingLineInterface[] = order.shipping_lines.map((data) => {
    const taxRate = data.tax_lines[0]?.rate;

    return {
      name: data.title,
      price: convertTTCtoHT(parseFloat(data.price), taxRate) - refundedShippingAmount,
      quantity: 1,
      tax: taxRate ?? '',
    };
  });

  const payload: SheetExport.Invoice.Data = {
    reference: order.name,
    notes: order.note,
    exportedDate: new Date(order.created_at).toISOString(),
    billingAddress: formatMultilineAddress(order.billing_address, order.contact_email),
    shippingAddress: formatMultilineAddress(order.shipping_address, order.contact_email),
    items,
    shipping,
  };

  return JSON.stringify(payload);
};

const formatMultilineAddress = (address, fallback = ''): SheetExport.Address => {
  if (address) {
    return {
      name: address?.name ?? '' + (address?.company != '' ? `\n${address?.company}` : ''),
      countryCode: address?.country_code,
      address:
        [
          address?.address1,
          address?.address2,
          [address?.zip, address?.city].filter((value) => value && value !== '').join(' '),
          address.country,
        ]
          .filter((value) => value && value !== '')
          .join('\n') ?? '',
    };
  }
  return {
    name: fallback,
    address: '',
  };
};
// #endregion
