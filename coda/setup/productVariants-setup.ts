// #region Imports
import * as coda from '@codahq/packs-sdk';

import { VariantClient } from '../../Clients/GraphQlClients';
import { InvalidValueVisibleError, SyncUpdateRequiredPropertyMissingVisibleError } from '../../Errors/Errors';
import { CACHE_DEFAULT } from '../../constants/cacheDurations-constants';
import { OPTIONS_PRODUCT_STATUS_GRAPHQL, OPTIONS_PUBLISHED_STATUS } from '../../constants/options-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { VARIANT_OPTION_KEYS, VariantModel } from '../../models/graphql/VariantModel';
import { ProductVariantRow } from '../../schemas/CodaRows.types';
import { formatProductReference } from '../../schemas/syncTable/ProductSchema';
import { ProductVariantSyncTableSchema } from '../../schemas/syncTable/ProductVariantSchema';
import { SyncedVariants } from '../../sync/graphql/SyncedVariants';
import { MetafieldOwnerType } from '../../types/admin.types';
import { assertAllowedValue, isNullishOrEmpty } from '../../utils/helpers';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../utils/coda-parameters';
import { makeDeleteGraphQlResourceAction, optionValues } from '../utils/coda-utils';

// #endregion

// #region Helper functions
function createSyncedVariants(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedVariants({
    context,
    codaSyncParams,
    model: VariantModel,
    client: VariantClient.createInstance(context),
    validateSyncParams,
    validateSyncUpdate,
  });
}

function validateSyncParams({ publishedStatus, statusArray }: { publishedStatus?: string; statusArray?: string[] }) {
  const invalidMsg: string[] = [];
  if (
    !isNullishOrEmpty(statusArray) &&
    !assertAllowedValue(statusArray, optionValues(OPTIONS_PRODUCT_STATUS_GRAPHQL))
  ) {
    invalidMsg.push(`status: ${statusArray.join(', ')}`);
  }
  if (
    !isNullishOrEmpty(publishedStatus) &&
    !assertAllowedValue(publishedStatus, optionValues(OPTIONS_PUBLISHED_STATUS))
  ) {
    invalidMsg.push(`publishedStatus: ${publishedStatus}`);
  }
  if (invalidMsg.length) {
    throw new InvalidValueVisibleError(invalidMsg.join(', '));
  }
}

export function validateSyncUpdate(prevRow: ProductVariantRow, newRow: ProductVariantRow) {
  const requiredMsg: string[] = [];
  if (!isNullishOrEmpty(newRow.weight) && isNullishOrEmpty(newRow.weight_unit)) {
    requiredMsg.push('weight_unit');
  }
  if (isNullishOrEmpty(newRow.weight) && !isNullishOrEmpty(newRow.weight_unit)) {
    requiredMsg.push('weight');
  }
  const hasOptionsKeySet = VARIANT_OPTION_KEYS.some((key) => newRow.hasOwnProperty(key));
  const hasAllOptionKeysSet = VARIANT_OPTION_KEYS.every((key) => newRow.hasOwnProperty(key));
  if (hasOptionsKeySet && !hasAllOptionKeysSet) {
    requiredMsg.push(VARIANT_OPTION_KEYS.filter((key) => !newRow.hasOwnProperty(key)).join(', '));
  }

  if (requiredMsg.length) {
    throw new SyncUpdateRequiredPropertyMissingVisibleError(requiredMsg.join(', '));
  }
}
// #endregion

// protected static translateCodaSyncParamsFromVariantToProduct(
//   codaSyncParams: CodaSyncParams<typeof Sync_ProductVariants>
// ): CodaSyncParams<typeof Sync_Products> {
//   const [
//     syncMetafields, // syncMetafields
//     product_type, // productTypesArray
//     created_at, // createdAtRange
//     updated_at, // updatedAtRange
//     // published_at, // publishedAtRange
//     status, // statusArray
//     published_status, // publishedStatus
//     vendor, // vendorsArray
//     skus, // skuArray
//     ids, // idArray
//   ] = codaSyncParams;

//   return [
//     syncMetafields, // syncMetafields
//     product_type, // productTypesArray
//     created_at, // createdAtRange
//     updated_at, // updatedAtRange
//     status, // statusArray
//     published_status, // publishedStatus
//     vendor, // vendorsArray
//     ids, // idArray
//     undefined, // tagsArray
//   ];
// }

// #region Sync Tables
export const Sync_ProductVariants = coda.makeSyncTable({
  name: 'ProductVariants',
  description:
    'Return ProductVariants from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.ProductVariant,
  schema: SyncedVariants.staticSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return SyncedVariants.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncProductVariants',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedVariants.codaParamsMap}
     */
    parameters: [
      { ...filters.general.syncMetafields, optional: true },
      { ...filters.product.productTypesArray, optional: true },
      { ...filters.product.createdAtRange, optional: true },
      { ...filters.product.updatedAtRange, optional: true },
      { ...filters.product.statusArray, optional: true },
      { ...filters.product.publishedStatus, optional: true },
      { ...filters.product.vendorsArray, optional: true },
      { ...filters.productVariant.skuArray, optional: true },
      { ...filters.product.idArray, name: 'productIds', optional: true },
      // { ...filters.productVariant.options, optional: true },
    ],
    execute: async (codaSyncParams, context) => createSyncedVariants(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedVariants(codaSyncParams, context).executeSyncUpdate(updates),
  },
});
// #endregion

// #region Actions
export const Action_CreateProductVariant = coda.makeFormula({
  name: 'CreateProductVariant',
  description: 'Create a new Shopify Product Variant and return its ID.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...inputs.product.id, name: 'productId', description: 'The ID of the parent product.' },
    {
      ...inputs.productVariant.option1,
      description: 'Option 1 of 3 of the product variant. At least one option is required.',
    },
    // optional parameters
    { ...inputs.productVariant.barcode, optional: true },
    { ...inputs.productVariant.compareAtPrice, optional: true },
    { ...inputs.productVariant.option2, optional: true },
    { ...inputs.productVariant.option3, optional: true },
    { ...inputs.productVariant.position, optional: true },
    { ...inputs.productVariant.price, optional: true },
    { ...inputs.productVariant.sku, optional: true },
    { ...inputs.productVariant.taxable, optional: true },
    { ...inputs.productVariant.weight, optional: true },
    { ...inputs.productVariant.weightUnit, optional: true },
    { ...inputs.productVariant.cost, optional: true },
    { ...inputs.productVariant.countryCodeOfOrigin, optional: true },
    { ...inputs.productVariant.harmonizedSystemCode, optional: true },
    { ...inputs.productVariant.provinceCode, optional: true },
    { ...inputs.productVariant.tracked, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('create', 'Product Variant'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function (
    [
      product_id,
      option1,
      barcode,
      compare_at_price,
      option2,
      option3,
      position,
      price,
      sku,
      taxable,
      weight,
      weight_unit,
      cost,
      country_code_of_origin,
      harmonized_system_code,
      province_code_of_origin,
      tracked,
      metafields,
    ],
    context
  ) {
    const row: ProductVariantRow = {
      id: undefined,
      title: undefined,
      product: formatProductReference(product_id),
      barcode,
      compare_at_price,
      option1,
      option2,
      option3,
      price,
      position,
      sku,
      taxable,
      weight,
      weight_unit,
      cost,
      country_code_of_origin,
      harmonized_system_code,
      province_code_of_origin,
      tracked,
    };
    validateSyncUpdate({} as ProductVariantRow, row);

    const variant = VariantModel.createInstanceFromRow(context, row);
    if (metafields) {
      variant.data.metafields = CodaMetafieldSet.createGraphQlMetafieldsArray(metafields, {
        context,
        ownerType: MetafieldOwnerType.Productvariant,
      });
    }

    await variant.save();
    return variant.restId;
  },
});

export const Action_UpdateProductVariant = coda.makeFormula({
  name: 'UpdateProductVariant',
  description: 'Update an existing Shopify product variant and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.productVariant.id,
    // optional parameters
    { ...inputs.productVariant.barcode, optional: true },
    { ...inputs.productVariant.compareAtPrice, optional: true },
    { ...inputs.productVariant.option1, optional: true },
    { ...inputs.productVariant.option2, optional: true },
    { ...inputs.productVariant.option3, optional: true },
    { ...inputs.productVariant.position, optional: true },
    { ...inputs.productVariant.price, optional: true },
    { ...inputs.productVariant.sku, optional: true },
    { ...inputs.productVariant.taxable, optional: true },
    { ...inputs.productVariant.weight, optional: true },
    { ...inputs.productVariant.weightUnit, optional: true },
    { ...inputs.productVariant.cost, optional: true },
    { ...inputs.productVariant.countryCodeOfOrigin, optional: true },
    { ...inputs.productVariant.harmonizedSystemCode, optional: true },
    { ...inputs.productVariant.provinceCode, optional: true },
    { ...inputs.productVariant.tracked, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('update', 'Product Variant'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(ProductVariantSchema, IdentitiesNew.productVariant),
  schema: ProductVariantSyncTableSchema,
  execute: async function (
    [
      productVariantId,
      barcode,
      compare_at_price,
      option1,
      option2,
      option3,
      position,
      price,
      sku,
      taxable,
      weight,
      weight_unit,
      cost,
      country_code_of_origin,
      harmonized_system_code,
      province_code_of_origin,
      tracked,
      metafields,
    ],
    context
  ) {
    const row: ProductVariantRow = {
      id: productVariantId,
      title: undefined,
      barcode,
      compare_at_price,
      option1,
      option2,
      option3,
      price,
      position,
      sku,
      taxable,
      weight,
      weight_unit,
      cost,
      country_code_of_origin,
      harmonized_system_code,
      province_code_of_origin,
      tracked,
    };
    validateSyncUpdate({} as ProductVariantRow, row);

    const variant = VariantModel.createInstanceFromRow(context, row);
    if (metafields) {
      variant.data.metafields = CodaMetafieldSet.createGraphQlMetafieldsArray(metafields, {
        context,
        ownerType: MetafieldOwnerType.Productvariant,
        ownerGid: variant.graphQlGid,
      });
    }

    await variant.save();
    return variant.toCodaRow();
  },
});

export const Action_DeleteProductVariant = makeDeleteGraphQlResourceAction({
  modelName: VariantModel.displayName,
  IdParameter: inputs.productVariant.id,
  execute: async ([itemId], context) => {
    await VariantClient.createInstance(context).delete({
      id: idToGraphQlGid(GraphQlResourceNames.ProductVariant, itemId as number),
    });
    return true;
  },
});

// #endregion

// #region Formulas
export const Formula_ProductVariant = coda.makeFormula({
  name: 'ProductVariant',
  description: 'Return a single Product Variant from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.productVariant.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: SyncedVariants.staticSchema,
  execute: async ([productVariantId], context) => {
    const response = await VariantClient.createInstance(context).single({
      id: idToGraphQlGid(GraphQlResourceNames.ProductVariant, productVariantId as number),
    });
    const variant = VariantModel.createInstance(context, response.body);
    return variant.toCodaRow();
  },
});

export const Format_ProductVariant: coda.Format = {
  name: 'ProductVariant',
  instructions: 'Paste the ID of the product variant into the column.',
  formulaName: 'ProductVariant',
};
// #endregion
