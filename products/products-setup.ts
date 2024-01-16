import * as coda from '@codahq/packs-sdk';

import { IDENTITY_PRODUCT, OPTIONS_PRODUCT_STATUS, OPTIONS_PUBLISHED_STATUS } from '../constants';
import {
  syncProductsGraphQlAdmin,
  autocompleteProductTypes,
  productSyncTableDynamicOptions,
  executeProductsSyncTableUpdate,
  fetchProduct,
  formatProductForSchemaFromRestApi,
  deleteProduct,
  updateProduct,
  formatProductForSchemaFromGraphQlApi,
  DEFAULT_PRODUCT_OPTION_NAME,
  validateProductParams,
  createProduct,
} from './products-functions';
import { ProductSchema } from './products-schema';
import { sharedParameters } from '../shared-parameters';
import { graphQlGidToId } from '../helpers-graphql';
import { cleanQueryParams } from '../helpers-rest';
import { SyncUpdateNoPreviousValues } from '../types/misc';
import { ProductFieldsFragment, UpdateProductMutation } from '../types/admin.generated';

const parameters = {
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
  // #region Sync Tables
  // Products Sync Table
  pack.addSyncTable({
    name: 'Products',
    description:
      'Return Products from this shop. You can also fetch metafields by selection them in advanced settings but be aware that it will slow down the sync.',
    identityName: IDENTITY_PRODUCT,
    schema: ProductSchema,
    dynamicOptions: productSyncTableDynamicOptions,
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
  // #endregion

  // #region Formulas
  pack.addFormula({
    name: 'Product',
    description: 'Get a single product data.',
    parameters: [parameters.productGid],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: ProductSchema,
    execute: async ([productGid], context) => {
      const response = await fetchProduct(graphQlGidToId(productGid), context);
      if (response.body.product) {
        return formatProductForSchemaFromRestApi(response.body.product, context);
      }
    },
  });
  // #endregion

  // #region Actions
  // CreateProduct Action
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
    execute: async function (
      [
        title,
        descriptionHtml,
        productType,
        options,
        tags,
        vendor,
        status = 'DRAFT',
        handle,
        images,
        imagesUrls,
        templateSuffix,
      ],
      context
    ) {
      if (imagesUrls !== undefined && images !== undefined)
        throw new coda.UserVisibleError("Provide either 'imagesFromCoda' or 'imagesUrls', not both");

      const imagesToUse = imagesUrls ? imagesUrls : images;
      const params = cleanQueryParams({
        title,
        body_html: descriptionHtml,
        productType,
        options: options ? options.map((name) => ({ name, values: [DEFAULT_PRODUCT_OPTION_NAME] })) : undefined,
        tags,
        vendor,
        status,
        handle,
        images: imagesToUse ? imagesToUse.map((url) => ({ src: url })) : undefined,
        imagesUrls,
        templateSuffix,
      });

      validateProductParams(params);

      // TODO: make a function to convert from rest admin api values to graphql api values and vice versa
      // GraphQL status is uppercase, convert it for Rest Admin API
      if (params.status) {
        params.status = status.toLowerCase();
      }

      // We need to add a default variant to the product if some options are defined
      if (params.options) {
        params['variants'] = [
          {
            option1: DEFAULT_PRODUCT_OPTION_NAME,
            option2: DEFAULT_PRODUCT_OPTION_NAME,
            option3: DEFAULT_PRODUCT_OPTION_NAME,
          },
        ];
      }

      const response = await createProduct(params, context);
      return response.body.product.admin_graphql_api_id;
    },
  });

  // UpdateProduct Action
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
    execute: async function (
      [productGid, title, descriptionHtml, product_type, tags, vendor, status, handle, template_suffix],
      context
    ) {
      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(ProductSchema);
      const newValue = {
        title,
        descriptionHtml,
        product_type,
        tags,
        vendor,
        status,
        handle,
        template_suffix,
      };
      const updatedFields = Object.keys(newValue).filter((key) => newValue[key] !== undefined);
      const update: SyncUpdateNoPreviousValues = { newValue, updatedFields };
      const response = await updateProduct(productGid, effectivePropertyKeys, [], [], update, context);
      const data = response.body.data as UpdateProductMutation;
      const product = data.productUpdate.product as ProductFieldsFragment;
      console.log('product', product);
      return formatProductForSchemaFromGraphQlApi(product, context, []);
    },
  });

  // DeleteProduct Action
  pack.addFormula({
    name: 'DeleteProduct',
    description: 'Delete an existing Shopify product and return true on success.',
    parameters: [parameters.productGid],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async function ([productGid], context) {
      await deleteProduct(graphQlGidToId(productGid), context);
      return true;
    },
  });
  // #endregion

  // #region Column Formats
  // Product Column Format
  pack.addColumnFormat({
    name: 'Product',
    instructions: 'Paste the GraphQL GID of the product into the column.',
    formulaName: 'Product',
  });
  // #endregion
};
