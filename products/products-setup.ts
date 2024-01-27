import * as coda from '@codahq/packs-sdk';

import {
  DEFAULT_PRODUCT_OPTION_NAME,
  DEFAULT_PRODUCT_STATUS_REST,
  IDENTITY_PRODUCT,
  METAFIELD_PREFIX_KEY,
  OPTIONS_PRODUCT_STATUS_GRAPHQL,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  fetchProductRest,
  formatProductForSchemaFromRestApi,
  validateProductParams,
  createProductRest,
  getProductTypes,
  deleteProductRest,
  updateProductGraphQl,
  formatProductForSchemaFromGraphQlApi,
  handleProductUpdateJob,
} from './products-functions';
import { ProductSchemaGraphQl, ProductSchemaRest, productFieldDependencies } from './products-schema';
import {
  MAX_OPTIONS_PER_PRODUCT,
  QueryProductsAdmin,
  QueryProductsMetafieldsAdmin,
  buildProductsSearchQuery,
} from './products-graphql';
import { sharedParameters } from '../shared-parameters';

import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  graphQlGidToId,
  makeAugmentedSyncTableGraphQlRequest,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { augmentSchemaWithMetafields } from '../metafields/metafields-schema';
import {
  fetchMetafieldDefinitions,
  formatMetafieldsForSchema,
  getMetaFieldRealFromKey,
  makeAutocompleteMetafieldKeysFunction,
  separatePrefixedMetafieldsKeysFromKeys,
  splitMetaFieldFullKey,
} from '../metafields/metafields-functions';

// Import types
import {
  GetProductsMetafieldsQueryVariables,
  GetProductsWithMetafieldsQuery,
  GetProductsWithMetafieldsQueryVariables,
} from '../types/admin.generated';
import { MetafieldDefinition } from '../types/admin.types';
import { MetafieldRestInput } from '../types/Metafields';
import { SyncTableGraphQlContinuation, SyncTableRestAugmentedContinuation } from '../types/tableSync';
import { ProductSyncTableRestParams, ProductUpdateRestParams, ProductCreateRestParams } from '../types/Product';
import { arrayUnique, handleFieldDependencies } from '../helpers';

const parameters = {
  productGid: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'productGid',
    description: 'The GraphQL GID of the product.',
  }),
  status: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'status',
    description: 'The status of the product.',
    autocomplete: OPTIONS_PRODUCT_STATUS_GRAPHQL,
  }),
  singleStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'status',
    description: 'The status of the product.',
    autocomplete: OPTIONS_PRODUCT_STATUS_GRAPHQL,
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
  bodyHtml: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'bodyHtml',
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
  metafieldKey: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'metafieldKey',
    description: 'The metafield field key',
    autocomplete: makeAutocompleteMetafieldKeysFunction('PRODUCT'),
  }),
};

export const setupProducts = (pack: coda.PackDefinitionBuilder) => {
  // #region Sync Tables

  // Products Sync Table via Rest Admin API
  pack.addSyncTable({
    name: 'Products',
    description:
      'Return Products from this shop. You can also fetch metafields by selection them in advanced settings but be aware that it will slow down the sync.',
    identityName: IDENTITY_PRODUCT,
    schema: ProductSchemaRest,
    dynamicOptions: {
      getSchema: async function (context, _, { syncMetafields }) {
        let augmentedSchema: any = ProductSchemaRest;
        if (syncMetafields) {
          augmentedSchema = await augmentSchemaWithMetafields(ProductSchemaRest, 'PRODUCT', context);
        }
        // admin_url should always be the last featured property, regardless of any metafield keys added previously
        augmentedSchema.featuredProperties.push('admin_url');
        return augmentedSchema;
      },
      defaultAddDynamicColumns: false,
      propertyOptions: async function (context) {
        if (context.propertyName === 'product_type') {
          return getProductTypes(context);
        }
      },
    },
    // TODO: finish implementing Rest filters
    formula: {
      name: 'SyncProducts',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        {
          ...sharedParameters.productType,
          description: 'Filter results by product type.',
          optional: true,
        },
        sharedParameters.optionalSyncMetafields,
        { ...sharedParameters.filterCreatedAtRange, optional: true },
        { ...sharedParameters.filterUpdatedAtRange, optional: true },
        { ...sharedParameters.filterPublishedAtRange, optional: true },
        {
          ...sharedParameters.productStatusRest,
          description: 'Return only products matching these statuses.',
          optional: true,
        },
        {
          ...sharedParameters.productPublishedStatus,
          description: 'Return products by their published status.',
          optional: true,
        },
        {
          ...sharedParameters.productVendor,
          description: 'Return products by product vendor.',
          optional: true,
        },
        { ...sharedParameters.filterHandles, optional: true },
        {
          ...sharedParameters.productIds,
          description: 'Return only products specified by a comma-separated list of product IDs or GraphQL GIDs.',
          optional: true,
        },
      ],
      /**
       * Sync products using Rest Admin API, optionally augmenting the sync with
       * metafields from GraphQL Admin API
       */
      execute: async function (
        [
          product_type,
          syncMetafields,
          created_at,
          updated_at,
          published_at,
          status,
          published_status,
          vendor,
          handles,
          ids,
        ],
        context
      ) {
        const prevContinuation = context.sync.continuation as SyncTableRestAugmentedContinuation;
        console.log('prevContinuation', prevContinuation);
        const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
        const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
          separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

        const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(getMetaFieldRealFromKey);
        const shouldSyncMetafields = !!effectiveMetafieldKeys.length;
        let restLimit = REST_DEFAULT_LIMIT;
        let maxEntriesPerRun = restLimit;
        let shouldDeferBy = 0;
        let metafieldDefinitions: MetafieldDefinition[] = [];

        if (shouldSyncMetafields) {
          const defaultMaxEntriesPerRun = 50;
          const syncTableMaxEntriesAndDeferWait = await getGraphQlSyncTableMaxEntriesAndDeferWait(
            defaultMaxEntriesPerRun,
            prevContinuation,
            context
          );
          maxEntriesPerRun = syncTableMaxEntriesAndDeferWait.maxEntriesPerRun;
          restLimit = maxEntriesPerRun;
          shouldDeferBy = syncTableMaxEntriesAndDeferWait.shouldDeferBy;
          if (shouldDeferBy > 0) {
            return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
          }

          metafieldDefinitions =
            prevContinuation?.extraContinuationData?.metafieldDefinitions ??
            (await fetchMetafieldDefinitions('PRODUCT', context));
        }

        const restParams: ProductSyncTableRestParams = cleanQueryParams({
          fields: handleFieldDependencies(standardFromKeys, productFieldDependencies).join(', '),
          limit: restLimit,
          handle: handles && handles.length ? handles.join(',') : undefined,
          ids: ids && ids.length ? ids.join(',') : undefined,
          product_type,
          published_status,
          status: status && status.length ? status.join(',') : undefined,
          vendor,
          created_at_min: created_at ? created_at[0] : undefined,
          created_at_max: created_at ? created_at[1] : undefined,
          updated_at_min: updated_at ? updated_at[0] : undefined,
          updated_at_max: updated_at ? updated_at[1] : undefined,
          published_at_min: published_at ? published_at[0] : undefined,
          published_at_max: published_at ? published_at[1] : undefined,
        });
        validateProductParams(restParams, true);

        let url: string;
        if (prevContinuation?.nextUrl) {
          url = coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit });
        } else {
          url = coda.withQueryParams(
            `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products.json`,
            restParams
          );
        }

        let restResult = [];
        const { response: restResponse, continuation: restContinuation } = await makeSyncTableGetRequest(
          {
            url,
          },
          context
        );
        if (restResponse && restResponse.body?.products) {
          restResult = restResponse.body.products.map((product) => formatProductForSchemaFromRestApi(product, context));
        }

        if (!shouldSyncMetafields) {
          return {
            result: restResult,
            continuation: restContinuation,
          };
        }

        // Now we will sync metafields
        const payload = {
          query: QueryProductsMetafieldsAdmin,
          variables: {
            maxEntriesPerRun,
            metafieldKeys: effectiveMetafieldKeys,
            countMetafields: effectiveMetafieldKeys.length,
            searchQuery: buildProductsSearchQuery({ ids: restResult.map((p) => p.id) }),
          } as GetProductsMetafieldsQueryVariables,
        };

        const { response: augmentedResponse, continuation: augmentedContinuation } =
          await makeAugmentedSyncTableGraphQlRequest(
            {
              payload,
              maxEntriesPerRun,
              prevContinuation: prevContinuation as unknown as SyncTableRestAugmentedContinuation,
              restNextUrl: restContinuation?.nextUrl,
              extraContinuationData: {
                metafieldDefinitions,
              },
            },
            context
          );

        if (augmentedResponse && augmentedResponse.body?.data) {
          return {
            result: restResult.map((product) => {
              const match = augmentedResponse.body.data.products.nodes.find(
                (p: GetProductsWithMetafieldsQuery['products']['nodes'][number]) => graphQlGidToId(p.id) === product.id
              );
              if (match?.metafields?.nodes?.length) {
                return {
                  ...product,
                  ...formatMetafieldsForSchema(match.metafields.nodes, metafieldDefinitions),
                };
              }
              return product;
            }),
            continuation: augmentedContinuation,
          };
        }

        return {
          result: [],
          continuation: augmentedContinuation,
        };
      },
      maxUpdateBatchSize: 10,
      executeUpdate: async function (params, updates, context) {
        const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
        const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
        const metafieldDefinitions = hasUpdatedMetaFields ? await fetchMetafieldDefinitions('PRODUCT', context) : [];

        const jobs = updates.map((update) => handleProductUpdateJob(update, metafieldDefinitions, context));
        const completed = await Promise.allSettled(jobs);
        return {
          result: completed.map((job) => {
            if (job.status === 'fulfilled') return job.value;
            else return job.reason;
          }),
        };
      },
    },
  });
  // #endregion

  // #region Formulas
  pack.addFormula({
    name: 'Product',
    description: 'Get a single product data.',
    parameters: [sharedParameters.productId],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: ProductSchemaRest,
    execute: async ([productId], context) => {
      const response = await fetchProductRest(productId, context);
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
    description: 'Create a new Shopify Product and return Product Id.',
    parameters: [
      { ...parameters.title },
      { ...parameters.bodyHtml, optional: true },
      { ...sharedParameters.productType, optional: true },
      { ...parameters.options, optional: true },
      { ...parameters.tags, optional: true },
      { ...sharedParameters.productVendor, optional: true },
      { ...sharedParameters.productSingleStatusRest, optional: true },
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
    varargParameters: [parameters.metafieldKey, sharedParameters.metafieldValue],
    isAction: true,
    resultType: coda.ValueType.Number,
    execute: async function (
      [
        title,
        body_html,
        product_type,
        options,
        tags,
        vendor,
        status = DEFAULT_PRODUCT_STATUS_REST,
        handle,
        images,
        imagesUrls,
        template_suffix,
        ...varargs
      ],
      context
    ) {
      if (imagesUrls !== undefined && images !== undefined)
        throw new coda.UserVisibleError("Provide either 'imagesFromCoda' or 'imagesUrls', not both");

      let metafieldRestInputs: MetafieldRestInput[] = [];
      if (varargs && varargs.length) {
        const metafieldDefinitions = await fetchMetafieldDefinitions('PRODUCT', context);
        while (varargs.length > 0) {
          let metafieldKey: string, metafieldValue: string;
          [metafieldKey, metafieldValue, ...varargs] = varargs;
          const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafieldKey);
          const input: MetafieldRestInput = {
            namespace: metaNamespace,
            key: metaKey,
            value: metafieldValue,
            type: metafieldDefinitions.find((f) => f && f.namespace === metaNamespace && f.key === metaKey).type.name,
          };
          metafieldRestInputs.push(input);
        }
      }

      const imagesToUse = imagesUrls ? imagesUrls : images;
      const params: ProductCreateRestParams = {
        title,
        body_html,
        product_type,
        options: options ? options.map((name) => ({ name, values: [DEFAULT_PRODUCT_OPTION_NAME] })) : undefined,
        tags,
        vendor,
        // status or handle can unintentionally be empty strings if adding varargs parameters
        status: status && status !== '' ? status : DEFAULT_PRODUCT_STATUS_REST,
        handle: handle && handle !== '' ? handle : undefined,
        images: imagesToUse ? imagesToUse.map((url) => ({ src: url })) : undefined,
        template_suffix,
        metafields: metafieldRestInputs.length ? metafieldRestInputs : undefined,
      };

      // We need to add a default variant to the product if some options are defined
      if (params.options) {
        params.variants = [
          {
            option1: DEFAULT_PRODUCT_OPTION_NAME,
            option2: DEFAULT_PRODUCT_OPTION_NAME,
            option3: DEFAULT_PRODUCT_OPTION_NAME,
          },
        ];
      }

      const response = await createProductRest(params, context);
      return response.body.product.id;
    },
  });

  // UpdateProduct Action
  pack.addFormula({
    name: 'UpdateProduct',
    description: 'Update an existing Shopify product and return the updated data.',
    parameters: [
      sharedParameters.productId,
      { ...parameters.title, optional: true },
      { ...parameters.bodyHtml, optional: true },
      { ...sharedParameters.productType, optional: true },
      { ...parameters.tags, optional: true },
      { ...sharedParameters.productVendor, optional: true },
      { ...sharedParameters.productSingleStatusRest, optional: true },
      { ...parameters.handle, optional: true },
      { ...parameters.templateSuffix, optional: true },
    ],
    varargParameters: [parameters.metafieldKey, sharedParameters.metafieldValue],
    isAction: true,
    resultType: coda.ValueType.Object,
    //! withIdentity breaks relations when updating
    // schema: coda.withIdentity(ProductSchema, IDENTITY_PRODUCT),
    schema: ProductSchemaRest,
    /**
     * The update will be performed first with Rest Admin API for standard
     * fields and then with GraphQL Admin API for metafields. It's easier to
     * update metafields in GraphQL because we don't have to handle metafield
     * creation/update. Otherwise we would have to know the metafield ID when
     * we are updating a metafield
     */
    execute: async function (
      [productId, title, body_html, product_type, tags, vendor, status, handle, template_suffix, ...varargs],
      context
    ) {
      // Build a Coda update object for Rest Admin and GraphQL API updates
      let update: coda.SyncUpdate<string, string, typeof ProductSchemaRest>;

      const cleanedRestParams: ProductUpdateRestParams = cleanQueryParams({
        title,
        body_html,
        product_type,
        tags,
        vendor,
        status,
        handle,
        template_suffix,
      });

      update = {
        previousValue: {
          id: productId,
        },
        newValue: { ...cleanedRestParams },
        updatedFields: Object.keys(cleanedRestParams),
      };

      let metafieldDefinitions: MetafieldDefinition[] = [];
      const prefixedMetafieldFromKeys = [];
      if (varargs && varargs.length) {
        while (varargs.length > 0) {
          let metafieldKey: string, metafieldValue: string;
          [metafieldKey, metafieldValue, ...varargs] = varargs;
          const prefixedMetafieldFromKey = METAFIELD_PREFIX_KEY + metafieldKey;
          prefixedMetafieldFromKeys.push(prefixedMetafieldFromKey);
          update.newValue[prefixedMetafieldFromKey] = metafieldValue;
          update.updatedFields.push(prefixedMetafieldFromKey);
        }
      }
      if (prefixedMetafieldFromKeys.length) {
        metafieldDefinitions = await fetchMetafieldDefinitions('PRODUCT', context);
      }

      return handleProductUpdateJob(update, metafieldDefinitions, context);
    },
  });

  // DeleteProduct Action
  pack.addFormula({
    name: 'DeleteProduct',
    description: 'Delete an existing Shopify product and return true on success.',
    parameters: [sharedParameters.productId],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async function ([productId], context) {
      await deleteProductRest(productId, context);
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
