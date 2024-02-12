/**
 * Imported defintions from gas-coda-export-bills package
 */
/// <reference path="../node_modules/gas-coda-export-bills/Interfaces.d.ts"/>

import * as coda from '@codahq/packs-sdk';

import {
  NOT_FOUND,
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
  REST_DEFAULT_API_VERSION,
} from '../constants';
import { convertTTCtoHT } from '../helpers';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePutRequest } from '../helpers-rest';

import { formatCustomerForSchemaFromRestApi } from '../customers/customers-functions';
import { FormatFunction } from '../types/misc';
import { formatAddressDisplayName } from '../addresses/addresses-functions';
import { OrderSchema } from '../schemas/syncTable/OrderSchema';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import {
  getResourceMetafieldsRestUrl,
  handleResourceMetafieldsUpdateRest,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';
import { OrderUpdateRestParams } from '../types/Order';

// #region Helpers
export function validateOrderParams(params) {
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
}

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

export function formatOrderStandardFieldsRestParams(
  standardFromKeys: string[],
  values: coda.SyncUpdate<string, string, typeof OrderSchema>['newValue']
) {
  const restParams: any = {};
  standardFromKeys.forEach((fromKey) => {
    restParams[fromKey] = values[fromKey];
  });
  return restParams;
}

/**
 * On peut créer des metafields directement en un call mais apparemment ça ne
 * fonctionne que pour les créations, pas les updates, du coup on applique la
 * même stratégie que pour handleArticleUpdateJob, CAD il va falloir faire un
 * appel séparé pour chaque metafield
 */
export async function handleOrderUpdateJob(
  update: coda.SyncUpdate<string, string, typeof OrderSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: Promise<any>[] = [];
  const orderId = update.previousValue.id as number;

  if (standardFromKeys.length) {
    const restParams: OrderUpdateRestParams = formatOrderStandardFieldsRestParams(standardFromKeys, update.newValue);
    subJobs.push(updateOrderRest(orderId, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      handleResourceMetafieldsUpdateRest(
        getResourceMetafieldsRestUrl('orders', orderId, context),
        metafieldDefinitions,
        update,
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [updateJob, metafieldsJob] = await Promise.allSettled(subJobs);
  if (updateJob) {
    if (updateJob.status === 'fulfilled' && updateJob.value) {
      if (updateJob.value.body?.order) {
        obj = {
          ...obj,
          ...formatOrderForSchemaFromRestApi(updateJob.value.body.order, context),
        };
      }
    } else if (updateJob.status === 'rejected') {
      throw new coda.UserVisibleError(updateJob.reason);
    }
  }
  if (metafieldsJob) {
    if (metafieldsJob.status === 'fulfilled' && metafieldsJob.value) {
      obj = {
        ...obj,
        ...metafieldsJob.value,
      };
    } else if (metafieldsJob.status === 'rejected') {
      throw new coda.UserVisibleError(metafieldsJob.reason);
    }
  }

  return obj;
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

export const formatOrderForSchemaFromRestApi: FormatFunction = (order, context) => {
  let obj: any = {
    ...order,
    admin_url: `${context.endpoint}/admin/orders/${order.id}`,
  };

  if (order.customer) {
    obj.customer = formatCustomerForSchemaFromRestApi(order.customer, context);
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

  return obj;
};
// #endregion

// #region Requests
export const fetchOrder = async ([orderID], context) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/orders/${orderID}.json`;
  const response = await makeGetRequest({ url, cacheTtlSecs: 10 }, context);
  const { body } = response;

  if (body.order) {
    return formatOrderForSchemaFromRestApi(body.order, context);
  }
};

export const updateOrderRest = (orderId: number, params: OrderUpdateRestParams, context: coda.ExecutionContext) => {
  const restParams = cleanQueryParams(params);
  // validateOrderParams(params);
  const payload = { order: restParams };
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/orders/${orderId}.json`;
  return makePutRequest({ url, payload }, context);
};

};
// #endregion
