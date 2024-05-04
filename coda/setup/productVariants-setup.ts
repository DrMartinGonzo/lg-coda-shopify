// #region Imports
import * as coda from '@codahq/packs-sdk';

import { NotFoundVisibleError } from '../../Errors/Errors';
import { Product } from '../../Resources/Rest/Product';
import { Variant } from '../../Resources/Rest/Variant';
import { FromRow } from '../../Resources/types/Resource.types';
import { CACHE_DEFAULT, PACK_IDENTITIES } from '../../constants';
import { ProductVariantRow } from '../../schemas/CodaRows.types';
import { formatProductReference } from '../../schemas/syncTable/ProductSchemaRest';
import { ProductVariantSyncTableSchema } from '../../schemas/syncTable/ProductVariantSchema';
import { makeDeleteRestResourceAction } from '../../utils/coda-utils';
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
      return Variant.getDynamicSchema({ context, codaSyncParams: [, formulaContext.syncMetafields] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncProductVariants',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link Variant.getDynamicSchema}
     *  - {@link Variant.translateCodaSyncParamsFromVariantToProduct}
     *  - {@link Product.getFirstPageParams}
     */
    parameters: [
      { ...filters.product.productType, optional: true },
      { ...filters.general.syncMetafields, optional: true },
      // coda.makeParameter({
      //   type: coda.ParameterType.String,
      //   name: 'collection_id',
      //   description: 'Return products by product collection ID.',
      //   optional: true,
      // }),
      { ...filters.product.createdAtRange, optional: true },
      { ...filters.product.updatedAtRange, optional: true },
      { ...filters.product.publishedAtRange, optional: true },
      { ...filters.product.statusArray, optional: true },
      { ...filters.product.publishedStatus, optional: true },
      { ...filters.product.vendor, optional: true },
      { ...filters.product.handleArray, optional: true },
      { ...filters.product.idArray, name: 'productIds', optional: true },
    ],
    execute: async function (params, context) {
      return Variant.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      /**
       * Pour l'instant pas besoin d'utiliser formatRowWithParent,
       * les propriétés qui dépendent du produit parent ne vont pas bouger.
       // TODO: à réévaluer si jamais on update l'image utilisée par la variante
       */
      return Variant.syncUpdate(params, updates, context);
    },
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
        .map((s) => s.toMetafield({ context, owner_resource: Variant.metafieldRestOwnerType })
      ),
    };

    const newVariant = new Variant({ context, fromRow });
    await newVariant.saveAndUpdate();
    return newVariant.apiData.id;
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
        .map((s) => s.toMetafield({ context, owner_id: productVariantId, owner_resource: Variant.metafieldRestOwnerType })
      ),
    };

    const updatedVariant = new Variant({ context, fromRow });
    await updatedVariant.saveAndUpdate();

    // TODO: maybe incorporate the parent product fetching directly in Variant class ?
    if (updatedVariant) {
      const product = await Product.find({
        id: updatedVariant.apiData.product_id,
        fields: ['images', 'handle', 'status', 'title'].join(','),
        context,
      });
      updatedVariant.apiData.product_images = product.apiData.images;
      updatedVariant.apiData.product_handle = product.apiData.handle;
      updatedVariant.apiData.product_status = product.apiData.status;
      updatedVariant.apiData.product_title = product.apiData.title;

      return updatedVariant.formatToRow();
    }

    // return updatedVariant.formatToRow();

    // Add parent product info
    // const productFetcher = new ProductRestFetcher(context);
    // const productResponse = await productFetcher.fetch(variantRow.product?.id);
    // if (productResponse?.body?.product) {
    //   return variantFetcher.formatRowWithParent(variantRow, productResponse.body.product);
    // }

    // return variantRow;
  },
});

export const Action_DeleteProductVariant = makeDeleteRestResourceAction(Variant, inputs.productVariant.id);
// #endregion

// #region Formulas
export const Formula_ProductVariant = coda.makeFormula({
  name: 'ProductVariant',
  description: 'Get a single product variant data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.productVariant.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: ProductVariantSyncTableSchema,
  execute: async ([productVariantId], context) => {
    // TODO: maybe incorporate the parent product fetching directly in Variant class ?
    const variant = await Variant.find({ id: productVariantId, context });
    if (variant) {
      const product = await Product.find({
        id: variant.apiData.product_id,
        fields: ['images', 'handle', 'status', 'title'].join(','),
        context,
      });
      variant.apiData.product_images = product.apiData.images;
      variant.apiData.product_handle = product.apiData.handle;
      variant.apiData.product_status = product.apiData.status;
      variant.apiData.product_title = product.apiData.title;

      if (variant) {
        return variant.formatToRow();
      }
      throw new NotFoundVisibleError(PACK_IDENTITIES.ProductVariant);
    }
  },
});

export const Format_ProductVariant: coda.Format = {
  name: 'ProductVariant',
  instructions: 'Paste the ID of the product variant into the column.',
  formulaName: 'ProductVariant',
};
// #endregion
