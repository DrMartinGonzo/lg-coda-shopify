/**
 * Imported defintions from gas-coda-export-bills package
 */
/// <reference path="../node_modules/gas-coda-export-bills/Interfaces.d.ts"/>

import * as coda from '@codahq/packs-sdk';

import {
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
  REST_DEFAULT_API_VERSION,
} from '../constants';
import { convertTTCtoHT } from '../helpers';
import { cleanQueryParams, extractNextUrlPagination, makeGetRequest } from '../helpers-rest';

import { formatCustomer } from '../customers/customers-functions';
import { FormatFunction } from '../types/misc';

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

const formatMultilineAddress = (address, fallback = ''): SheetExport.Address => {
  if (address) {
    return {
      name: address?.name ?? '' + (address?.company != '' ? `\n${address?.company}` : ''),
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

export const formatOrder: FormatFunction = (data) => {
  if (data.customer) {
    data.customer = formatCustomer(data.customer);
  }

  return data;
};

export const fetchOrder = async ([orderID], context) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/orders/${orderID}.json`;
  const response = await makeGetRequest({ url, cacheTtlSecs: 10 }, context);
  const { body } = response;

  if (body.order) {
    return formatOrder(body.order);
  }
};

export const fetchOrders = async (
  status: string,
  created_at_max: string,
  created_at_min: string,
  financial_status: string,
  fulfillment_status: string,
  ids: string,
  maxEntriesPerRun: number,
  processed_at_max: string,
  processed_at_min: string,
  since_id: number,
  updated_at_max: string,
  updated_at_min: string,
  fields: string,

  nextUrl: string,
  context
) => {
  const params = cleanQueryParams({
    created_at_max,
    created_at_min,
    fields,
    financial_status,
    fulfillment_status,
    ids,
    limit: maxEntriesPerRun,
    processed_at_max,
    processed_at_min,
    since_id,
    status,
    updated_at_max,
    updated_at_min,
  });

  if (params.status && !OPTIONS_ORDER_STATUS.includes(params.status)) {
    throw new coda.UserVisibleError('Unknown status: ' + params.status);
  }
  if (params.financial_status && !OPTIONS_ORDER_FINANCIAL_STATUS.includes(params.financial_status)) {
    throw new coda.UserVisibleError('Unknown financial status: ' + params.financial_status);
  }
  if (params.fulfillment_status && !OPTIONS_ORDER_FULFILLMENT_STATUS.includes(params.fulfillment_status)) {
    throw new coda.UserVisibleError('Unknown fulfillment status: ' + params.financial_status);
  }

  let url =
    nextUrl ?? coda.withQueryParams(`${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/orders.json`, params);

  const response = await makeGetRequest({ url, cacheTtlSecs: 0 }, context);
  const { body } = response;

  return {
    items: body.orders ? body.orders.map(formatOrder) : [],
    // Check if we have paginated results
    nextUrl: extractNextUrlPagination(response),
  };
};

export const syncAllOrders = async (
  [
    status,
    created_at_max,
    created_at_min,
    financial_status,
    fulfillment_status,
    ids,
    maxEntriesPerRun,
    processed_at_max,
    processed_at_min,
    since_id,
    updated_at_max,
    updated_at_min,
  ],
  context
) => {
  // Only fetch the selected columns.
  // TODO: apply this to other sync tables
  const syncedFields = coda.getEffectivePropertyKeysFromSchema(context.sync.schema).join(', ');

  const res = await fetchOrders(
    status,
    created_at_max,
    created_at_min,
    financial_status,
    fulfillment_status,
    ids,
    maxEntriesPerRun,
    processed_at_max,
    processed_at_min,
    since_id,
    updated_at_max,
    updated_at_min,

    syncedFields,
    context.sync.continuation,

    context
  );

  return {
    result: res.items,
    continuation: res.nextUrl,
  };
};

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
