// #region Imports
import * as coda from '@codahq/packs-sdk';

import { Shop } from '../../Fetchers/NEW/Resources/Shop';
import { CACHE_DEFAULT, Identity } from '../../constants';
import { DraftOrderRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields, resolveSchemaFromContext } from '../../schemas/schema-helpers';
import { DraftOrderSyncTableSchema } from '../../schemas/syncTable/DraftOrderSchema';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../../shared-parameters';
import { MetafieldOwnerType } from '../../types/admin.types';
import { deepCopy } from '../../utils/helpers';
import { parseMetafieldsCodaInput } from '../metafields/utils/metafields-utils-keyValueSets';
import { DraftOrderRestFetcher } from './DraftOrderRestFetcher';
import { DraftOrderSyncTable } from './DraftOrderSyncTable';

// #endregion

async function getDraftOrderSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = deepCopy(DraftOrderSyncTableSchema);
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(
      DraftOrderSyncTableSchema,
      MetafieldOwnerType.Draftorder,
      context
    );
  }

  const shopCurrencyCode = await Shop.activeCurrency({ context });

  // Line items
  [augmentedSchema.properties.line_items.items.properties].forEach((properties) => {
    properties.price['currencyCode'] = shopCurrencyCode;
    properties.total_discount['currencyCode'] = shopCurrencyCode;
    properties.discount_allocations.items.properties.amount['currencyCode'] = shopCurrencyCode;
  });

  // Tax lines
  [
    augmentedSchema.properties.line_items.items.properties.tax_lines.items.properties,
    augmentedSchema.properties.tax_lines.items.properties,
    augmentedSchema.properties.line_items.items.properties.duties.items.properties.tax_lines.items.properties,
  ].forEach((properties) => {
    properties.price['currencyCode'] = shopCurrencyCode;
  });

  // Main props
  augmentedSchema.properties.subtotal_price['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.total_price['currencyCode'] = shopCurrencyCode;
  augmentedSchema.properties.total_tax['currencyCode'] = shopCurrencyCode;

  // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

async function resolveDraftOrderSchemaFromContext(params, context: coda.SyncExecutionContext) {
  const [syncMetafields] = params;
  return resolveSchemaFromContext(getDraftOrderSchema, context, { syncMetafields });
}

// #region Sync tables
export const Sync_DraftOrders = coda.makeSyncTable({
  name: 'DraftOrders',
  description:
    'Return DraftOrders from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.DraftOrder,
  schema: DraftOrderSyncTableSchema,
  dynamicOptions: {
    getSchema: getDraftOrderSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncDraftOrders',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link resolveDraftOrderSchemaFromContext}
     *  - {@link DraftOrderSyncTable}
     */
    parameters: [
      { ...filters.general.syncMetafields, optional: true },
      { ...filters.draftOrder.status, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.draftOrder.idArray, optional: true },
      { ...filters.general.sinceId, optional: true },
    ],
    execute: async function (params, context) {
      const schema = await resolveDraftOrderSchemaFromContext(params, context);
      const draftOrderSyncTable = new DraftOrderSyncTable(new DraftOrderRestFetcher(context), schema, params);
      return draftOrderSyncTable.executeSync();
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const schema = await resolveDraftOrderSchemaFromContext(params, context);
      const draftOrderSyncTable = new DraftOrderSyncTable(new DraftOrderRestFetcher(context), schema, params);
      return draftOrderSyncTable.executeUpdate(updates);
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
  // schema: coda.withIdentity(ArticleSchema, Identity.Article),
  schema: DraftOrderSyncTableSchema,
  execute: async function ([draftOrderId, email, note, tags, metafields], context) {
    let row: DraftOrderRow = {
      name: undefined, // shut up the typescript error
      id: draftOrderId,
      email,
      note,
      tags: tags ? tags.join(',') : undefined,
    };
    const metafieldKeyValueSets = parseMetafieldsCodaInput(metafields);
    const draftOrderFetcher = new DraftOrderRestFetcher(context);
    const restParams = draftOrderFetcher.formatRowToApi(row);
    return draftOrderFetcher.updateAndFormatToRow({
      id: draftOrderId,
      restUpdate: restParams,
      metafieldSets: metafieldKeyValueSets,
    });
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
    await new DraftOrderRestFetcher(context).complete(draftOrderId, { payment_gateway_id, payment_pending });
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
    await new DraftOrderRestFetcher(context).sendInvoice(draftOrderId, {
      to,
      from,
      bcc,
      subject,
      custom_message,
    });
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
    await new DraftOrderRestFetcher(context).delete(draftOrderId);
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
    const draftOrderFetcher = new DraftOrderRestFetcher(context);
    const response = await draftOrderFetcher.fetch(draftOrderId);
    if (response?.body?.draft_order) {
      return draftOrderFetcher.formatApiToRow(response.body.draft_order);
    }
  },
});

export const Format_DraftOrder: coda.Format = {
  name: 'DraftOrder',
  instructions: 'Paste the ID of the DraftOrder into the column.',
  formulaName: 'DraftOrder',
};
// #endregion
