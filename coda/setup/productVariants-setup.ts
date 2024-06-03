// #region Imports
import * as coda from '@codahq/packs-sdk';

import { NotFoundVisibleError } from '../../Errors/Errors';
import { VariantGraphQl } from '../../Resources/GraphQl/VariantGraphQl';
import { FromRow } from '../../Resources/types/Resource.types';
import { GraphQlResourceNames } from '../../Resources/types/SupportedResource';
import { CACHE_DEFAULT, PACK_IDENTITIES } from '../../constants';
import { ProductVariantRow } from '../../schemas/CodaRows.types';
import { formatProductReference } from '../../schemas/syncTable/ProductSchemaRest';
import { ProductVariantSyncTableSchema } from '../../schemas/syncTable/ProductVariantSchema';
import { makeDeleteGraphQlResourceAction } from '../../utils/coda-utils';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';

// #endregion

// #region Sync Tables
export const Sync_ProductVariants = coda.makeSyncTable({
  name: 'ProductVariants',
  description:
    'Return ProductVariants from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.ProductVariant,
  schema: ProductVariantSyncTableSchema,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return VariantGraphQl.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncProductVariants',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link VariantGraphQl.getDynamicSchema}
     *  - {@link VariantGraphQl.makeSyncTableManagerSyncFunction}
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
    execute: async (params, context) => VariantGraphQl.sync(params, context),
    maxUpdateBatchSize: 10,
    executeUpdate: async (params, updates, context) => VariantGraphQl.syncUpdate(params, updates, context),
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
      metafields,
    ],
    context
  ) {
    const fromRow: FromRow<ProductVariantRow> = {
      row: {
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
      },
      // prettier-ignore
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_resource: VariantGraphQl.metafieldRestOwnerType })
      ),
    };

    const newVariant = new VariantGraphQl({ context, fromRow });
    await newVariant.saveAndUpdate();
    return newVariant.restId;
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
      metafields,
    ],
    context
  ) {
    const fromRow: FromRow<ProductVariantRow> = {
      row: {
        id: productVariantId,
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
      },
      // prettier-ignore
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_id: productVariantId, owner_resource: VariantGraphQl.metafieldRestOwnerType })
      ),
    };

    const updatedVariant = new VariantGraphQl({ context, fromRow });
    await updatedVariant.saveAndUpdate();

    if (updatedVariant) {
      // await updatedVariant.refreshDataWithtParentProduct();
      return updatedVariant.formatToRow();
    }
  },
});

export const Action_DeleteProductVariant = makeDeleteGraphQlResourceAction(
  VariantGraphQl,
  inputs.productVariant.id,
  ({ context, id }) => VariantGraphQl.delete({ context, id: idToGraphQlGid(GraphQlResourceNames.ProductVariant, id) })
);
// #endregion

// #region Formulas
export const Formula_ProductVariant = coda.makeFormula({
  name: 'ProductVariant',
  description: 'Return a single Product Variant from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.productVariant.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: ProductVariantSyncTableSchema,
  execute: async ([productVariantId], context) => {
    const variant = await VariantGraphQl.find({
      context,
      id: idToGraphQlGid(GraphQlResourceNames.ProductVariant, productVariantId),
    });
    if (variant) {
      return variant.formatToRow();
    }
    throw new NotFoundVisibleError(PACK_IDENTITIES.ProductVariant);
  },
});

export const Format_ProductVariant: coda.Format = {
  name: 'ProductVariant',
  instructions: 'Paste the ID of the product variant into the column.',
  formulaName: 'ProductVariant',
};
// #endregion
