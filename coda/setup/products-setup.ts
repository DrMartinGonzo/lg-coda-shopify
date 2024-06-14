// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ProductClient } from '../../Clients/GraphQlClients';
import { InvalidValueVisibleError } from '../../Errors/Errors';
import { CACHE_DEFAULT } from '../../constants/cacheDurations-constants';
import { optionValues } from '../utils/coda-utils';
import {
  DEFAULT_PRODUCT_STATUS_GRAPHQL,
  OPTIONS_PRODUCT_STATUS_GRAPHQL,
  OPTIONS_PUBLISHED_STATUS,
} from '../../constants/options-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { ProductModel } from '../../models/graphql/ProductModel';
import { getTemplateSuffixesFor } from '../../models/rest/AssetModel';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { ProductRow } from '../../schemas/CodaRows.types';
import { ProductSyncTableSchema } from '../../schemas/syncTable/ProductSchema';
import { SyncedProducts } from '../../sync/graphql/SyncedProducts';
import { MetafieldOwnerType } from '../../types/admin.types';
import { makeDeleteGraphQlResourceAction } from '../utils/coda-utils';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { assertAllowedValue, assertNotBlank, isNullishOrEmpty } from '../../utils/helpers';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../utils/coda-parameters';

// #endregion

// #region Helper functions
function createSyncedProducts(codaSyncParams: coda.ParamValues<coda.ParamDefs>, context: coda.SyncExecutionContext) {
  return new SyncedProducts({
    context,
    codaSyncParams,
    model: ProductModel,
    client: ProductClient.createInstance(context),
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

function validateSyncUpdate(prevRow: ProductRow, newRow: ProductRow) {
  const invalidMsg: string[] = [];
  if (!assertNotBlank(newRow.title)) {
    invalidMsg.push("Product title can't be blank");
  }
  if (invalidMsg.length) {
    throw new InvalidValueVisibleError(invalidMsg.join(', '));
  }
}
// #endregion

// #region Sync Tables
// Products Sync Table via Rest Admin API
export const Sync_Products = coda.makeSyncTable({
  name: 'Products',
  description:
    'Return Products from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Product,
  schema: SyncedProducts.staticSchema,
  dynamicOptions: {
    getSchema: async (context, _, formulaContext) =>
      SyncedProducts.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] }),
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'product_type') {
        return ProductClient.createInstance(context).productTypes({});
      }
      if (context.propertyName === 'template_suffix') {
        return getTemplateSuffixesFor({ kind: 'product', context });
      }
    },
  },
  formula: {
    name: 'SyncProducts',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link SyncedProducts.codaParamsMap}
     */
    parameters: [
      { ...filters.general.syncMetafields, optional: true },
      { ...filters.product.productTypesArray, optional: true },
      { ...filters.general.createdAtRange, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.product.statusArray, optional: true },
      { ...filters.product.publishedStatus, optional: true },
      { ...filters.product.vendorsArray, optional: true },
      { ...filters.product.idArray, optional: true },
      { ...filters.product.tagsArray, optional: true },
    ],
    execute: async (codaSyncParams, context) => createSyncedProducts(codaSyncParams, context).executeSync(),
    maxUpdateBatchSize: 10,
    executeUpdate: async (codaSyncParams, updates, context) =>
      createSyncedProducts(codaSyncParams, context).executeSyncUpdate(updates),
  },
});

// #endregion

// #region Actions
export const Action_CreateProduct = coda.makeFormula({
  name: 'CreateProduct',
  description: 'Create a new Shopify Product and return its ID.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.product.title,

    // optional parameters
    { ...inputs.product.bodyHtml, optional: true },
    { ...filters.product.productType, optional: true },
    { ...inputs.general.tagsArray, optional: true },
    { ...inputs.product.vendor, optional: true },
    { ...inputs.product.status, optional: true },
    { ...inputs.product.handle, optional: true },
    { ...inputs.product.templateSuffix, optional: true },
    { ...inputs.product.options, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('create', 'Product'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function (
    [title, bodyHtml, productType, tags, vendor, status, handle, templateSuffix, options, metafields],
    context
  ) {
    validateSyncParams({ statusArray: [status] });
    const row: ProductRow = {
      id: undefined,
      title,
      body_html: bodyHtml,
      handle,
      product_type: productType,
      tags: tags ? tags.join(',') : undefined,
      template_suffix: templateSuffix,
      vendor,
      status: status ?? DEFAULT_PRODUCT_STATUS_GRAPHQL,
      options: options.join(','),
    };
    validateSyncUpdate(undefined, row);

    const product = ProductModel.createInstanceFromRow(context, row);
    if (metafields) {
      product.data.metafields = CodaMetafieldSet.createGraphQlMetafieldsArray(metafields, {
        context,
        ownerType: MetafieldOwnerType.Product,
      });
    }
    await product.save();
    return product.restId;
  },
});

export const Action_UpdateProduct = coda.makeFormula({
  name: 'UpdateProduct',
  description: 'Update an existing Shopify product and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.product.id,

    // optional parameters
    { ...inputs.product.title, optional: true },
    { ...inputs.product.bodyHtml, optional: true },
    { ...filters.product.productType, optional: true },
    { ...inputs.general.tagsArray, optional: true },
    { ...inputs.product.vendor, optional: true },
    { ...inputs.product.status, optional: true },
    { ...inputs.product.handle, optional: true },
    { ...inputs.product.templateSuffix, optional: true },
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('update', 'Product'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(ProductSchemaRest, IdentitiesNew.product),
  schema: ProductSyncTableSchema,
  execute: async function (
    [productId, title, body_html, product_type, tags, vendor, status, handle, template_suffix, metafields],
    context
  ) {
    validateSyncParams({ statusArray: [status] });
    const row: ProductRow = {
      id: productId,
      body_html,
      handle,
      product_type,
      tags: tags ? tags.join(',') : undefined,
      template_suffix,
      title,
      vendor,
      status,
    };
    validateSyncUpdate(undefined, row);

    const product = ProductModel.createInstanceFromRow(context, row);
    if (metafields) {
      product.data.metafields = CodaMetafieldSet.createGraphQlMetafieldsArray(metafields, {
        context,
        ownerType: MetafieldOwnerType.Product,
        ownerGid: product.graphQlGid,
      });
    }

    await product.save();
    return product.toCodaRow();
  },
});

export const Action_DeleteProduct = makeDeleteGraphQlResourceAction({
  modelName: ProductModel.displayName,
  IdParameter: inputs.product.id,
  execute: async ([itemId], context) => {
    await ProductClient.createInstance(context).delete({
      id: idToGraphQlGid(GraphQlResourceNames.Product, itemId as number),
    });
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Product = coda.makeFormula({
  name: 'Product',
  description: 'Return a single Product from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.product.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: ProductSyncTableSchema,
  execute: async ([product_id], context) => {
    const response = await ProductClient.createInstance(context).single({
      id: idToGraphQlGid(GraphQlResourceNames.Product, product_id),
    });
    return ProductModel.createInstance(context, response.body).toCodaRow();

    // const product = await ProductGraphQl.find({
    //   context,
    //   id: idToGraphQlGid(GraphQlResourceNames.Product, product_id),
    // });
    // if (product) {
    //   return product.formatToRow();
    // }
    // throw new NotFoundVisibleError(PACK_IDENTITIES.Product);
  },
});

export const Format_Product: coda.Format = {
  name: 'Product',
  instructions: 'Paste the ID of the product into the column.',
  formulaName: 'Product',
  /**
  // ! regex won't work for now as it uses a different network domain.
   * {@see https://coda.io/packs/build/latest/guides/blocks/column-formats/#matchers}
   */
  // matchers: [new RegExp('^https://admin.shopify.com/store/.*/products/([0-9]+)$')],
};
// #endregion

// #region Unused stuff
/*
  pack.addFormula({
    name: 'InCollection',
    description: 'Check if specified product is in specified collection.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'productGid',
        description: 'The gid of the product.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'collectionGid',
        description: 'The gid of the collection.',
      }),
    ],
    cacheTtlSecs: CACHE_DEFAULT,
    resultType: coda.ValueType.Boolean,
    execute: checkProductInCollection,
  });
  */
// #endregion
