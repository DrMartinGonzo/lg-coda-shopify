/**
 * Imported defintions from gas-coda-export-bills package
 */
/// <reference path="../node_modules/gas-coda-export-bills/Interfaces.d.ts"/>

import * as coda from '@codahq/packs-sdk';

import {
  NOT_FOUND,
  OPTIONS_DRAFT_ORDER_STATUS,
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
  REST_DEFAULT_API_VERSION,
} from '../constants';
import { cleanQueryParams, makeDeleteRequest, makeGetRequest, makePutRequest } from '../helpers-rest';

import { formatCustomerForSchemaFromRestApi } from '../customers/customers-functions';
import { FetchRequestOptions } from '../types/Requests';
import { formatAddressDisplayName } from '../addresses/addresses-functions';
import { MetafieldDefinitionFragment } from '../types/admin.generated';
import {
  getMetafieldKeyValueSetsFromUpdate,
  separatePrefixedMetafieldsKeysFromKeys,
  updateAndFormatResourceMetafieldsRest,
} from '../metafields/metafields-functions';
import { OrderUpdateRestParams } from '../types/Order';
import { restResources } from '../types/RequestsRest';
import type { DraftOrder as DraftOrderRest } from '@shopify/shopify-api/rest/admin/2023-10/draft_order';
import { DraftOrderSyncTableSchema } from '../schemas/syncTable/DraftOrderSchema';
import { formatOrderReferenceValueForSchema } from '../schemas/syncTable/OrderSchema';
import { DraftOrderUpdateRestParams } from '../types/DraftOrder';

// #region Helpers
export function validateDraftOrderParams(params) {
  if (params.status) {
    const validStatuses = OPTIONS_DRAFT_ORDER_STATUS;
    (Array.isArray(params.status) ? params.status : [params.status]).forEach((status) => {
      if (!validStatuses.includes(status)) throw new coda.UserVisibleError('Unknown status: ' + params.status);
    });
  }

  return true;
}

function formatDraftOrderStandardFieldsRestParams(
  standardFromKeys: string[],
  values: coda.SyncUpdate<string, string, typeof DraftOrderSyncTableSchema>['newValue']
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
export async function handleDraftOrderUpdateJob(
  update: coda.SyncUpdate<string, string, typeof DraftOrderSyncTableSchema>,
  metafieldDefinitions: MetafieldDefinitionFragment[],
  context: coda.ExecutionContext
) {
  const { updatedFields } = update;
  const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(updatedFields);

  const subJobs: (Promise<any> | undefined)[] = [];
  const draftOrderId = update.previousValue.id as number;

  if (standardFromKeys.length) {
    const restParams: DraftOrderUpdateRestParams = formatDraftOrderStandardFieldsRestParams(
      standardFromKeys,
      update.newValue
    );
    subJobs.push(updateDraftOrderRest(draftOrderId, restParams, context));
  } else {
    subJobs.push(undefined);
  }

  if (prefixedMetafieldFromKeys.length) {
    subJobs.push(
      updateAndFormatResourceMetafieldsRest(
        {
          ownerId: draftOrderId,
          ownerResource: restResources.DraftOrder,
          metafieldKeyValueSets: await getMetafieldKeyValueSetsFromUpdate(
            prefixedMetafieldFromKeys,
            update.newValue,
            metafieldDefinitions,
            context
          ),
        },
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  let obj = { ...update.previousValue };

  const [updateJob, metafieldsJob] = await Promise.all(subJobs);
  if (updateJob?.body?.draft_order) {
    obj = {
      ...obj,
      ...formatDraftOrderForSchemaFromRestApi(updateJob.body.draft_order, context),
    };
  }
  if (metafieldsJob) {
    obj = {
      ...obj,
      ...metafieldsJob,
    };
  }
  return obj;
}
// #endregion

// #region Formatting functions
export const formatDraftOrderForSchemaFromRestApi = (draftOrder, context: coda.ExecutionContext) => {
  let obj: any = {
    ...draftOrder,
    admin_url: `${context.endpoint}/admin/draft_orders/${draftOrder.id}`,
  };

  if (draftOrder.customer) {
    obj.customer = formatCustomerForSchemaFromRestApi(draftOrder.customer, context);
  }
  if (draftOrder.billing_address) {
    obj.billing_address = {
      display: formatAddressDisplayName(draftOrder.billing_address),
      ...draftOrder.billing_address,
    };
  }
  if (draftOrder.shipping_address) {
    obj.shipping_address = {
      display: formatAddressDisplayName(draftOrder.shipping_address),
      ...draftOrder.shipping_address,
    };
  }
  if (draftOrder.order_id) {
    obj.order = formatOrderReferenceValueForSchema(draftOrder.order_id, NOT_FOUND);
  }

  return obj;
};
// #endregion

// #region Rest Requests
export const fetchSingleDraftOrderRest = (
  draftOrderID: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
): Promise<coda.FetchResponse<{ draft_order: DraftOrderRest }>> => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/draft_orders/${draftOrderID}.json`;
  return makeGetRequest({ ...requestOptions, url }, context);
};

export const updateDraftOrderRest = (
  draftOrderID: number,
  params: OrderUpdateRestParams,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const restParams = cleanQueryParams(params);
  if (Object.keys(restParams).length) {
    validateDraftOrderParams(params);
    const payload = { draft_order: restParams };
    const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/draft_orders/${draftOrderID}.json`;
    return makePutRequest({ ...requestOptions, url, payload }, context);
  }
};

export const deleteDraftOrderRest = (
  draftOrderID: number,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const url = `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/draft_orders/${draftOrderID}.json`;
  return makeDeleteRequest({ ...requestOptions, url }, context);
};
// #endregion
