// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { FromRow } from '../../Resources/Abstract/Rest/AbstractSyncedRestResource';
import { DraftOrder } from '../../Resources/Rest/DraftOrder';
import { CACHE_DEFAULT, PACK_IDENTITIES } from '../../constants';
import { DraftOrderRow } from '../../schemas/CodaRows.types';
import { DraftOrderSyncTableSchema } from '../../schemas/syncTable/DraftOrderSchema';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';

// #endregion

// #region Sync tables
export const Sync_DraftOrders = coda.makeSyncTable({
  name: 'DraftOrders',
  description:
    'Return DraftOrders from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.DraftOrder,
  schema: DraftOrderSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return DraftOrder.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncDraftOrders',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link DraftOrder.getDynamicSchema}
     *  - {@link DraftOrder.makeSyncTableManagerSyncFunction}
     */
    parameters: [
      { ...filters.general.syncMetafields, optional: true },
      { ...filters.draftOrder.status, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.draftOrder.idArray, optional: true },
      { ...filters.general.sinceId, optional: true },
    ],
    execute: async function (params, context) {
      return DraftOrder.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return DraftOrder.syncUpdate(params, updates, context);
    },
  },
});
// #endregion

// #region Actions
// TODO: CreateDraftOrder
// export const Action_CreateDraftOrder = coda.makeFormula({
//   name: 'CreateDraftOrder',
//   description: 'Create a new Shopify draft order and return its ID.',
//   connectionRequirement: coda.ConnectionRequirement.Required,
//   parameters: [inputs.draftOrder.id],
//   isAction: true,
//   resultType: coda.ValueType.Boolean,
//   execute: async function ([draftOrderId], context) {},
// });

// TODO: UpdateDraftOrder
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
    const fromRow: FromRow<DraftOrderRow> = {
      row: {
        // name: undefined, // shut up the typescript error
        id: draftOrderId,
        email,
        note,
        tags: tags ? tags.join(',') : undefined,
      },
      // prettier-ignore
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_id: draftOrderId, owner_resource: DraftOrder.metafieldRestOwnerType })
      ),
    };

    const updatedDraftOrder = new DraftOrder({ context, fromRow });
    await updatedDraftOrder.saveAndUpdate();
    return updatedDraftOrder.formatToRow();
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
    const draftOrder = new DraftOrder({ context, fromRow: { row: { id: draftOrderId } } });
    await draftOrder.complete({ payment_gateway_id, payment_pending });
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
    const draftOrder = new DraftOrder({ context, fromRow: { row: { id: draftOrderId } } });
    await draftOrder.send_invoice({});
    return true;
  },
});

export const Action_DeleteDraftOrder = coda.makeFormula({
  name: 'DeleteDraftOrder',
  description: 'Delete an existing Shopify draft order and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.draftOrder.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([draftOrderId], context) {
    await DraftOrder.delete({ context, id: draftOrderId });
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_DraftOrder = coda.makeFormula({
  name: 'DraftOrder',
  description: 'Get a single draft order data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.draftOrder.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: DraftOrderSyncTableSchema,
  execute: async function ([draftOrderId], context) {
    const draftOrder = await DraftOrder.find({ context, id: draftOrderId });
    return draftOrder.formatToRow();
  },
});

export const Format_DraftOrder: coda.Format = {
  name: 'DraftOrder',
  instructions: 'Paste the ID of the DraftOrder into the column.',
  formulaName: 'DraftOrder',
};
// #endregion
