// #region Imports
import * as coda from '@codahq/packs-sdk';

import { DraftOrderClient } from '../../Clients/RestClients';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { optionValues } from '../utils/coda-utils';
import { OPTIONS_DRAFT_ORDER_STATUS } from '../../constants/options-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { DraftOrderModel } from '../../models/rest/DraftOrderModel';
import { DraftOrderRow } from '../../schemas/CodaRows.types';
import { DraftOrderSyncTableSchema } from '../../schemas/syncTable/DraftOrderSchema';
import { SyncedDraftOrders } from '../../sync/rest/SyncedDraftOrders';
import { MetafieldOwnerType } from '../../types/admin.types';
import { makeDeleteRestResourceAction, makeFetchSingleRestResourceAction } from '../utils/coda-utils';
import { assertAllowedValue, isNullish, isNullishOrEmpty } from '../../utils/helpers';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedDraftOrders(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedDraftOrders({
    context,
    codaSyncParams,
    model: DraftOrderModel,
    client: DraftOrderClient.createInstance(context),
    validateSyncParams,
    validateSyncUpdate,
  });
}

function validateSyncParams({ status }: { status?: string }) {
  const invalidMsg: string[] = [];
  if (!isNullishOrEmpty(status) && !assertAllowedValue(status, optionValues(OPTIONS_DRAFT_ORDER_STATUS))) {
    invalidMsg.push(`status: ${status}`);
  }

  if (invalidMsg.length) {
    throw new InvalidValueVisibleError(invalidMsg.join(', '));
  }
}

function validateSyncUpdate(prevRow: DraftOrderRow, newRow: DraftOrderRow) {
  if (prevRow.status === 'completed' && [newRow.email, newRow.note].some((v) => !isNullish(v))) {
    throw new coda.UserVisibleError("Can't update email or note on a completed draft order.");
  }
}
// #endregion

// #region Sync tables
export const Sync_DraftOrders = coda.makeSyncTable({
  name: 'DraftOrders',
  description:
    'Return DraftOrders from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.DraftOrder,
  schema: SyncedDraftOrders.staticSchema,
  dynamicOptions: {
    getSchema: async (context, _, formulaContext) =>
      SyncedDraftOrders.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] }),
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncDraftOrders',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedDraftOrders.codaParamsMap}
     */
    parameters: [
      { ...filters.general.syncMetafields, optional: true },
      { ...filters.draftOrder.status, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.draftOrder.idArray, optional: true },
      { ...filters.general.sinceId, optional: true },
    ],
    execute: async (codaSyncParams, context) => createSyncedDraftOrders(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedDraftOrders(codaSyncParams, context).executeSyncUpdate(updates),
  },
});
// #endregion

// #region Actions
export const Action_UpdateDraftOrder = coda.makeFormula({
  name: 'UpdateDraftOrder',
  description: 'Update a draft order and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.draftOrder.id,

    // optional parameters
    { ...inputs.customer.email, description: "The customer's email address.", optional: true },
    {
      ...inputs.customer.note,
      description: 'A note that a merchant can attach to the draft order.',
      optional: true,
    },
    { ...inputs.general.tagsArray, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('update', 'DraftOrder'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(ArticleSchema, IdentitiesNew.article),
  schema: DraftOrderSyncTableSchema,
  execute: async function ([draftOrderId, email, note, tags, metafields], context) {
    const draftOrder = DraftOrderModel.createInstanceFromRow(context, {
      id: draftOrderId,
      name: undefined,
      email,
      note,
      tags: tags ? tags.join(',') : undefined,
    });
    if (metafields) {
      draftOrder.data.metafields = CodaMetafieldSet.createGraphQlMetafieldsArray(metafields, {
        context,
        ownerType: MetafieldOwnerType.Draftorder,
        ownerGid: draftOrder.graphQlGid,
      });
    }

    await draftOrder.save();
    return draftOrder.toCodaRow();
  },
});

export const Action_CompleteDraftOrder = coda.makeFormula({
  name: 'CompleteDraftOrder',
  description:
    'Completes a draft order. Will be set as `payed` with default payment Gateway unless paymentPending is set to `true`.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.draftOrder.id,
    //optional parameters
    { ...inputs.draftOrder.paymentGatewayId, optional: true },
    { ...inputs.draftOrder.paymentPending, optional: true },
  ],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([draftOrderId, payment_gateway_id, payment_pending], context) {
    await DraftOrderClient.createInstance(context).complete({ id: draftOrderId, payment_gateway_id, payment_pending });
    return true;
  },
});

export const Action_SendDraftOrderInvoice = coda.makeFormula({
  name: 'SendDraftOrderInvoice',
  description:
    'Sends an invoice for the draft order. You can customize the message and who to send the invoice to/from. Return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.draftOrder.id,

    //optional parameters
    { ...inputs.general.emailTo, optional: true },
    { ...inputs.general.emailFrom, optional: true },
    { ...inputs.general.emailBcc, optional: true },
    { ...inputs.general.emailSubject, optional: true },
    { ...inputs.general.emailMessage, optional: true },
  ],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([draftOrderId, to, from, bcc, subject, custom_message], context) {
    await DraftOrderClient.createInstance(context).send_invoice({
      id: draftOrderId,
      to,
      from,
      bcc,
      subject,
      custom_message,
    });
    return true;
  },
});

export const Action_DeleteDraftOrder = makeDeleteRestResourceAction({
  modelName: DraftOrderModel.displayName,
  IdParameter: inputs.draftOrder.id,
  execute: async ([itemId], context) => {
    await DraftOrderClient.createInstance(context).delete({ id: itemId as number });
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_DraftOrder = makeFetchSingleRestResourceAction({
  modelName: DraftOrderModel.displayName,
  IdParameter: inputs.draftOrder.id,
  schema: SyncedDraftOrders.staticSchema,
  execute: async ([itemId], context) => {
    const response = await DraftOrderClient.createInstance(context).single({ id: itemId as number });
    return DraftOrderModel.createInstance(context, response.body).toCodaRow();
  },
});

export const Format_DraftOrder: coda.Format = {
  name: 'DraftOrder',
  instructions: 'Paste the ID of the DraftOrder into the column.',
  formulaName: 'DraftOrder',
};
// #endregion
