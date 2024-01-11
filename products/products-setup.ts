import * as coda from '@codahq/packs-sdk';

import { IDENTITY_PRODUCT, OPTIONS_PRODUCT_STATUS, OPTIONS_PUBLISHED_STATUS } from '../constants';
import {
  formulaProduct,
  syncProductsGraphQlAdmin,
  autocompleteProductTypes,
  getProductSyncTableDynamicOptions,
  executeProductsSyncTableUpdate,
  actionUpdateProduct,
  actionDeleteProduct,
  actionCreateProduct,
} from './products-functions';
import { ProductSchema } from './products-schema';
import { sharedParameters } from '../shared-parameters';

const parameters = {
  articleID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'articleID',
    description: 'The id of the article.',
  }),
  productGid: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'productGid',
    description: 'The GraphQL GID of the product.',
  }),
  productIds: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'productIds',
    description: 'Return only products specified by a comma-separated list of product IDs or GraphQL GIDs.',
  }),
  status: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'status',
    description: 'The status of the product.',
    autocomplete: OPTIONS_PRODUCT_STATUS,
  }),
  singleStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'status',
    description: 'The status of the product.',
    autocomplete: OPTIONS_PRODUCT_STATUS,
  }),
  productType: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'productType',
    description: 'The product type.',
    autocomplete: autocompleteProductTypes,
  }),
  productTypes: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'productTypes',
    description: 'Filter results by product types.',
    autocomplete: autocompleteProductTypes,
  }),
  publishedStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'publishedStatus',
    description: 'The product published status.',
    autocomplete: OPTIONS_PUBLISHED_STATUS,
  }),
  vendor: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'vendor',
    description: 'The product vendor.',
  }),
  vendors: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'vendors',
    description: 'Return products by product vendors.',
  }),
  giftCard: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'giftCard',
    description: 'Whether the product is a gift card.',
  }),

  templateSuffix: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'templateSuffix',
    description:
      'The suffix of the Liquid template used for the product page. If this property is null, then the product page uses the default template.',
  }),
  handle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'handle',
    description:
      "A unique human-friendly string for the product. If you update the handle, the old handle won't be redirected to the new one automatically.",
  }),
  title: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'The name of the product.',
  }),
  descriptionHtml: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'descriptionHtml',
    description: 'The description of the product, complete with HTML markup.',
  }),
  tags: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'tags',
    description: 'A string of comma-separated tags.',
  }),
  options: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'options',
    description:
      'A comma-separated list of up to 3 options for how this product can vary. Options are things like "Size" or "Color".',
  }),
};

export const setupProducts = (pack: coda.PackDefinitionBuilder) => {
  /**====================================================================================================================
   *    Sync tables
   *===================================================================================================================== */
  pack.addSyncTable({
    name: 'Products',
    description:
      'Return Products from this shop. You can also fetch metafields by selection them in advanced settings but be aware that it will slow down the sync.',
    identityName: IDENTITY_PRODUCT,
    schema: ProductSchema,
    dynamicOptions: getProductSyncTableDynamicOptions,
    formula: {
      name: 'SyncProducts',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'search',
          description: 'Filter by case-insensitive search of all the fields in a product.',
          optional: true,
        }),
        {
          ...parameters.productTypes,
          description: 'Filter results by product types.',
          optional: true,
        },
        { ...sharedParameters.filterCreatedAtRange, optional: true },
        { ...sharedParameters.filterUpdatedAtRange, optional: true },
        // { ...sharedParameters.filterPublishedAtRange, optional: true },
        {
          ...parameters.status,
          description: 'Return only products matching these statuses.',
          optional: true,
        },
        {
          ...parameters.publishedStatus,
          description: 'Return products by their published status.',
          optional: true,
        },
        {
          ...parameters.vendors,
          description: 'Return products by product vendors.',
          optional: true,
        },
        {
          ...parameters.giftCard,
          description: 'Return only products marked as gift cards.',
          optional: true,
        },
        {
          ...parameters.productIds,
          description: 'Return only products specified by a comma-separated list of product IDs or GraphQL GIDs.',
          optional: true,
        },
      ],
      execute: syncProductsGraphQlAdmin,
      maxUpdateBatchSize: 10,
      executeUpdate: executeProductsSyncTableUpdate,
    },
  });

  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  pack.addFormula({
    name: 'Product',
    description: 'Get a single product data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'productID',
        description: 'The id of the product.',
      }),
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: ProductSchema,
    execute: formulaProduct,
  });

  pack.addFormula({
    name: 'CreateProduct',
    description: 'Create a new Shopify Product and return GraphQl GID.',
    parameters: [
      { ...parameters.title },
      { ...parameters.descriptionHtml, optional: true },
      { ...parameters.productType, optional: true },
      { ...parameters.options, optional: true },
      { ...parameters.tags, optional: true },
      { ...parameters.vendor, optional: true },
      { ...parameters.singleStatus, optional: true },
      { ...parameters.handle, optional: true },
      coda.makeParameter({
        type: coda.ParameterType.ImageArray,
        name: 'imagesFromCoda',
        description:
          "A list of Coda image references to use in the product. 🚨 You can't use both imagesFromCoda and imagesUrls parameter.",
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.StringArray,
        name: 'imagesUrls',
        description:
          "A list of image urls to use in the product. 🚨 You can't use both imagesFromCoda and imagesUrls parameter.",
        optional: true,
      }),
      { ...parameters.templateSuffix, optional: true },
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: actionCreateProduct,
  });

  pack.addFormula({
    name: 'UpdateProduct',
    description: 'Update an existing Shopify product and return the updated data.',
    parameters: [
      parameters.productGid,
      { ...parameters.title, optional: true },
      { ...parameters.descriptionHtml, optional: true },
      { ...parameters.productType, optional: true },
      { ...parameters.tags, optional: true },
      { ...parameters.vendor, optional: true },
      { ...parameters.singleStatus, optional: true },
      { ...parameters.handle, optional: true },
      { ...parameters.templateSuffix, optional: true },
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    //! withIdentity breaks relations when updating
    // schema: coda.withIdentity(ProductSchema, IDENTITY_PRODUCT),
    schema: ProductSchema,
    execute: actionUpdateProduct,
  });

  pack.addFormula({
    name: 'DeleteProduct',
    description: 'Delete an existing Shopify product and return true on success.',
    parameters: [parameters.productGid],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: actionDeleteProduct,
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'Product',
    instructions: 'Get a single product data.',
    formulaName: 'Product',
  });
};
