import * as coda from '@codahq/packs-sdk';

import { OPTIONS_ORDER_FINANCIAL_STATUS, OPTIONS_ORDER_FULFILLMENT_STATUS, OPTIONS_ORDER_STATUS } from '../constants';
import { cleanQueryParams, extractNextUrlPagination, getTokenPlaceholder, convertTTCtoHT } from '../helpers';

import { formatCustomer } from '../customers/customers-functions';

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

const formatMultilineAddress = (address) => {
  return {
    name: address?.name ?? '',
    company: address?.company ?? '',
    address:
      [
        address?.address1,
        address?.address2,
        [address?.zip, address?.city].filter((value) => value && value !== '').join(' '),
      ]
        .filter((value) => value && value !== '')
        .join('\n') ?? '',
  };
};

export const formatOrder = (data) => {
  if (data.customer) {
    data.customer = formatCustomer(data.customer);
  }

  return data;
};

export const fetchOrder = async ([orderID], context) => {
  const response = await context.fetcher.fetch({
    method: 'GET',
    url: `${context.endpoint}/admin/api/2022-07/orders/${orderID}.json`,
    cacheTtlSecs: 10,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
  });

  const { body } = response;

  if (body.order) {
    return formatOrder(body.order);
  }
};

export const fetchAllOrders = async (
  [
    status,
    created_at_max,
    created_at_min,
    fields,
    financial_status,
    fulfillment_status,
    ids,
    limit,
    processed_at_max,
    processed_at_min,
    since_id,
    updated_at_max,
    updated_at_min,
  ],
  context
) => {
  const params = cleanQueryParams({
    created_at_max,
    created_at_min,
    fields,
    financial_status,
    fulfillment_status,
    ids,
    limit,
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
    context.sync.continuation ?? coda.withQueryParams(`${context.endpoint}/admin/api/2022-07/orders.json`, params);

  const response = await context.fetcher.fetch({
    method: 'GET',
    url: url,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getTokenPlaceholder(context),
    },
    cacheTtlSecs: 0,
  });

  const { body } = response;

  // Check if we have paginated results
  const nextUrl = extractNextUrlPagination(response);

  let items = [];
  if (body.orders) {
    items = body.orders.map(formatOrder);
  }

  return {
    result: items,
    continuation: nextUrl,
  };
};

export const formatOrderForDocExport = (order) => {
  const discountApplications = order.discount_applications;
  const refunds = order.refunds;

  const discounts = [];

  discountApplications.forEach((discountApplication, index) => {
    const collectedAmounts = [];
    order.line_items.forEach((item) => {
      const taxRate = item.tax_lines[0]?.rate;
      const quantityAfterRefunds = item.quantity - getRefundQuantity(item, refunds);

      if (quantityAfterRefunds > 0) {
        item.discount_allocations.forEach((discountAllocation) => {
          if (discountAllocation.discount_application_index === index) {
            // totalAmount += discountAllocation.amount;
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
          discounts.push({
            name,
            price: collectedAmounts
              .filter((a) => a.tax === tax)
              .reduce((prev, curr) => prev + convertTTCtoHT(curr.amount, tax), 0),
            quantity: -1,
            tax: tax ?? null,
            type: discountApplication.type,
          });
        });
      } else {
        discounts.push({
          name,
          price: collectedAmounts.reduce((prev, curr) => prev + curr.amount, 0),
          quantity: -1,
          tax: null,
          type: discountApplication.type,
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

  const items = order.line_items.map((data) => {
    const taxRate = data.tax_lines[0]?.rate;
    const quantityAfterRefunds = data.quantity - getRefundQuantity(data, refunds);

    return {
      name: data.title + (data.variant_title ? ' - ' + data.variant_title : ''),
      price: convertTTCtoHT(parseFloat(data.price), taxRate),
      quantity: quantityAfterRefunds ?? 0,
      refunded: false,
      tax: taxRate,
    };
  });

  const shipping = order.shipping_lines.map((data) => {
    const taxRate = data.tax_lines[0]?.rate;

    return {
      name: data.title,
      price: convertTTCtoHT(parseFloat(data.price), taxRate) - refundedShippingAmount,
      quantity: 1,
      refunded: false,
      tax: taxRate ?? '',
    };
  });

  const payload = {
    reference: order.name,
    notes: order.note,
    timestamp: new Date(order.created_at).getTime() / 1000,
    billingAddress: formatMultilineAddress(order.billing_address),
    shippingAddress: formatMultilineAddress(order.shipping_address),

    items,
    discounts,
    shipping,
  };

  return JSON.stringify(payload);
  // return JSON.stringify(payload, null, 4);
};
