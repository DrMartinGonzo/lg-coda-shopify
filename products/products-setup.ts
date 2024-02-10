import * as coda from '@codahq/packs-sdk';

import {
  CACHE_MINUTE,
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
  handleProductUpdateJob,
} from './products-functions';
import { ProductSchemaRest, productFieldDependencies } from './products-schema';
import { QueryProductsMetafieldsAdmin, buildProductsSearchQuery } from './products-graphql';
import { sharedParameters } from '../shared-parameters';

import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  getMixedSyncTableRemainingAndToProcessItems,
  graphQlGidToId,
  makeMixedSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { augmentSchemaWithMetafields } from '../metafields/metafields-schema';
import {
  fetchMetafieldDefinitions,
  findMatchingMetafieldDefinition,
  formatMetafieldsForSchema,
  getMetaFieldRealFromKey,
  makeAutocompleteMetafieldKeysFunction,
  separatePrefixedMetafieldsKeysFromKeys,
  splitMetaFieldFullKey,
} from '../metafields/metafields-functions';

// Import types
import {
  GetProductsMetafieldsQuery,
  GetProductsMetafieldsQueryVariables,
  MetafieldDefinitionFragment,
} from '../types/admin.generated';
import { MetafieldRestInput } from '../types/Metafields';
import { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';
import { ProductSyncTableRestParams, ProductCreateRestParams } from '../types/Product';
import { arrayUnique, compareByDisplayKey, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import {
  UpdateCreateProp,
  getMetafieldsCreateUpdateProps,
  getVarargsMetafieldDefinitionsAndUpdateCreateProps,
  parseVarargsCreateUpdatePropsValues,
} from '../helpers-varargs';
import { MetafieldOwnerType } from '../types/Metafields';
import { getTemplateSuffixesFor } from '../themes/themes-functions';

async function getProductSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema: any = ProductSchemaRest;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(ProductSchemaRest, MetafieldOwnerType.Product, context);
  }
  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

/**
 * The properties that can be updated when updating a product.
 */
const standardUpdateProps: UpdateCreateProp[] = [
  { display: 'Title', key: 'title', type: 'string' },
  { display: 'Body HTML', key: 'body_html', type: 'string' },
  { display: 'Product type', key: 'product_type', type: 'string' },
  { display: 'Tags', key: 'tags', type: 'string' },
  { display: 'Vendor', key: 'vendor', type: 'string' },
  { display: 'Status', key: 'status', type: 'string' },
  { display: 'Handle', key: 'handle', type: 'string' },
  { display: 'Template suffix', key: 'template_suffix', type: 'string' },
];
/**
 * The properties that can be updated when creating a product.
 */
const standardCreateProps = [
  ...standardUpdateProps.filter((prop) => prop.key !== 'title'),
  { display: 'Images URLs', key: 'images', type: 'productImageUrls' },
  { display: 'Options', key: 'options', type: 'productCreateOptions' },
];

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
    autocomplete: makeAutocompleteMetafieldKeysFunction(MetafieldOwnerType.Product),
  }),
};

export const setupProducts = (pack: coda.PackDefinitionBuilder) => {
  // #region Sync Tables
  // Products Sync Table via Rest Admin API
  pack.addSyncTable({
    name: 'Products',
    description:
      'Return Products from this shop. You can also fetch metafields by selection them in advanced settings.',
    identityName: IDENTITY_PRODUCT,
    schema: ProductSchemaRest,
    dynamicOptions: {
      getSchema: getProductSchema,
      defaultAddDynamicColumns: false,
      propertyOptions: async function (context) {
        if (context.propertyName === 'product_type') {
          return getProductTypes(context);
        }
        if (context.propertyName === 'template_suffix') {
          return getTemplateSuffixesFor('product', context);
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
        // If executing from CLI, schema is undefined, we have to retrieve it first
        const schema =
          context.sync.schema ?? (await wrapGetSchemaForCli(getProductSchema, context, { syncMetafields }));
        const prevContinuation = context.sync.continuation as SyncTableMixedContinuation;
        const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
        const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
          separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

        const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(getMetaFieldRealFromKey);
        const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

        let restLimit = REST_DEFAULT_LIMIT;
        let maxEntriesPerRun = restLimit;
        let shouldDeferBy = 0;
        let metafieldDefinitions: MetafieldDefinitionFragment[] = [];

        if (shouldSyncMetafields) {
          // TODO: calc this
          const defaultMaxEntriesPerRun = 200;
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
            (await fetchMetafieldDefinitions(MetafieldOwnerType.Product, context));
        }

        let restItems = [];
        let restContinuation: SyncTableRestContinuation = null;
        const skipNextRestSync = prevContinuation?.extraContinuationData?.skipNextRestSync ?? false;

        // Rest Admin API Sync
        if (!skipNextRestSync) {
          const syncedStandardFields = handleFieldDependencies(standardFromKeys, productFieldDependencies);
          const restParams: ProductSyncTableRestParams = cleanQueryParams({
            fields: syncedStandardFields.join(', '),
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
          const { response, continuation } = await makeSyncTableGetRequest({ url }, context);
          restContinuation = continuation;

          if (response && response.body?.products) {
            restItems = response.body.products.map((product) => formatProductForSchemaFromRestApi(product, context));
          }

          if (!shouldSyncMetafields) {
            return {
              result: restItems,
              continuation: restContinuation,
            };
          }
        }

        // GraphQL Admin API metafields augmented Sync
        if (shouldSyncMetafields) {
          const { toProcess, remaining } = getMixedSyncTableRemainingAndToProcessItems(
            prevContinuation,
            restItems,
            maxEntriesPerRun
          );
          const uniqueIdsToFetch = arrayUnique(toProcess.map((c) => c.id)).sort();
          const graphQlPayload = {
            query: QueryProductsMetafieldsAdmin,
            variables: {
              maxEntriesPerRun,
              metafieldKeys: effectiveMetafieldKeys,
              countMetafields: effectiveMetafieldKeys.length,
              cursor: prevContinuation?.cursor,
              searchQuery: buildProductsSearchQuery({ ids: uniqueIdsToFetch }),
            } as GetProductsMetafieldsQueryVariables,
          };

          let { response: augmentedResponse, continuation: augmentedContinuation } =
            await makeMixedSyncTableGraphQlRequest(
              {
                payload: graphQlPayload,
                maxEntriesPerRun,
                prevContinuation: prevContinuation as unknown as SyncTableMixedContinuation,
                nextRestUrl: restContinuation?.nextUrl,
                extraContinuationData: {
                  metafieldDefinitions,
                  currentBatch: {
                    remaining: remaining,
                    processing: toProcess,
                  },
                },
                getPageInfo: (data: GetProductsMetafieldsQuery) => data.products?.pageInfo,
              },
              context
            );

          if (augmentedResponse && augmentedResponse.body?.data) {
            const customersData = augmentedResponse.body.data as GetProductsMetafieldsQuery;
            const augmentedItems = toProcess
              .map((product) => {
                const graphQlNodeMatch = customersData.products.nodes.find((c) => graphQlGidToId(c.id) === product.id);

                // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
                if (!graphQlNodeMatch) return;

                if (graphQlNodeMatch?.metafields?.nodes?.length) {
                  return {
                    ...product,
                    ...formatMetafieldsForSchema(graphQlNodeMatch.metafields.nodes, metafieldDefinitions),
                  };
                }
                return product;
              })
              .filter((p) => p); // filter out undefined items

            return {
              result: augmentedItems,
              continuation: augmentedContinuation,
            };
          }

          return {
            result: [],
            continuation: augmentedContinuation,
          };
        }

        return {
          result: [],
        };
      },
      maxUpdateBatchSize: 10,
      executeUpdate: async function (params, updates, context) {
        const allUpdatedFields = arrayUnique(updates.map((update) => update.updatedFields).flat());
        const hasUpdatedMetaFields = allUpdatedFields.some((fromKey) => fromKey.startsWith(METAFIELD_PREFIX_KEY));
        const metafieldDefinitions = hasUpdatedMetaFields
          ? await fetchMetafieldDefinitions(MetafieldOwnerType.Product, context)
          : [];

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

  // Product Column Format
  // TODO: add link regex ?
  pack.addColumnFormat({
    name: 'Product',
    instructions: 'Paste the ID of the product into the column.',
    formulaName: 'Product',
    // matchers: [new RegExp('^https://.*myshopify.com/admin/products/([0-9]+)$')],
  });
  // #endregion

  // #region Actions
  // CreateProduct Action
  pack.addFormula({
    name: 'CreateProduct',
    description: 'Create a new Shopify Product and return Product Id.',
    parameters: [{ ...parameters.title }],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The product variant property to create.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions(
            MetafieldOwnerType.Product,
            context,
            CACHE_MINUTE
          );
          const searchObjs = standardCreateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
          return result.sort(compareByDisplayKey);
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.Number,
    execute: async function ([title, ...varargs], context) {
      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Product, context);

      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardCreateProps, metafieldUpdateCreateProps);
      const { prefixedMetafieldFromKeys, standardFromKeys } = separatePrefixedMetafieldsKeysFromKeys(
        Object.keys(newValues)
      );

      // We can use Rest Admin API to create metafields
      let metafieldRestInputs: MetafieldRestInput[] = [];
      prefixedMetafieldFromKeys.forEach((fromKey) => {
        const realFromKey = getMetaFieldRealFromKey(fromKey);
        const { metaKey, metaNamespace } = splitMetaFieldFullKey(realFromKey);
        const matchingMetafieldDefinition = findMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);
        const input: MetafieldRestInput = {
          namespace: metaNamespace,
          key: metaKey,
          value: newValues[fromKey],
          type: matchingMetafieldDefinition?.type.name,
        };
        metafieldRestInputs.push(input);
      });

      const params: ProductCreateRestParams = {
        title,
        metafields: metafieldRestInputs.length ? metafieldRestInputs : undefined,
      };
      standardFromKeys.forEach((key) => (params[key] = newValues[key]));

      // We need to add a default variant to the product if some options are defined
      if (params.options && Array.isArray(params.options) && params.options.length) {
        params.variants = [
          {
            option1: DEFAULT_PRODUCT_OPTION_NAME,
            option2: DEFAULT_PRODUCT_OPTION_NAME,
            option3: DEFAULT_PRODUCT_OPTION_NAME,
          },
        ];
      }
      if (!params.status) {
        params.status = DEFAULT_PRODUCT_STATUS_REST;
      }

      const response = await createProductRest(params, context);
      return response.body.product.id;
    },
  });

  // UpdateProduct Action
  pack.addFormula({
    name: 'UpdateProduct',
    description: 'Update an existing Shopify product and return the updated data.',
    parameters: [sharedParameters.productId],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The product property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions(
            MetafieldOwnerType.Product,
            context,
            CACHE_MINUTE
          );
          const searchObjs = standardUpdateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          const result = await coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
          return result.sort(compareByDisplayKey);
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    //! withIdentity breaks relations when updating
    // schema: coda.withIdentity(ProductSchema, IDENTITY_PRODUCT),
    schema: ProductSchemaRest,
    execute: async function ([product_id, ...varargs], context) {
      // Build a Coda update object for Rest Admin and GraphQL API updates
      let update: coda.SyncUpdate<string, string, any>;

      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, MetafieldOwnerType.Product, context);
      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardUpdateProps, metafieldUpdateCreateProps);

      update = {
        previousValue: { id: product_id },
        newValue: newValues,
        updatedFields: Object.keys(newValues),
      };
      update.newValue = cleanQueryParams(update.newValue);

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

  // #region Unused stuff
  /*
  // Products Sync Table via GraphQL Admin API
  pack.addSyncTable({
    name: 'ProductsGraphQL',
    description:
      'Return Products from this shop. You can also fetch metafields by selection them in advanced settings but be aware that it will slow down the sync.',
    identityName: IDENTITY_PRODUCT + '_GRAPHQL',
    schema: ProductSchemaGraphQl,
    dynamicOptions: {
      getSchema: async function (context, _, { syncMetafields }) {
        let augmentedSchema: any = ProductSchemaGraphQl;
        if (syncMetafields) {
          augmentedSchema = await augmentSchemaWithMetafields(ProductSchemaGraphQl, MetafieldOwnerType.Product, context);
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
    formula: {
      name: 'SyncProductsGraphQL',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'search',
          description: 'Filter by case-insensitive search of all the fields in a product.',
          optional: true,
        }),
        {
          ...sharedParameters.productTypes,
          description: 'Filter results by product types.',
          optional: true,
        },
        { ...sharedParameters.filterCreatedAtRange, optional: true },
        { ...sharedParameters.filterUpdatedAtRange, optional: true },
        sharedParameters.optionalSyncMetafields,
        // { ...sharedParameters.filterPublishedAtRange, optional: true },
        {
          ...parameters.status,
          description: 'Return only products matching these statuses.',
          optional: true,
        },
        {
          ...sharedParameters.productPublishedStatus,
          description: 'Return products by their published status.',
          optional: true,
        },
        {
          ...sharedParameters.productVendors,
          description: 'Return products by product vendors.',
          optional: true,
        },
        {
          ...parameters.giftCard,
          description: 'Return only products marked as gift cards.',
          optional: true,
        },
        {
          ...sharedParameters.productIds,
          description: 'Return only products specified by a comma-separated list of product IDs or GraphQL GIDs.',
          optional: true,
        },
      ],
      execute: async function (
        [
          search,
          product_types,
          created_at,
          updated_at,
          syncMetafields,
          status,
          published_status,
          vendors,
          gift_card,
          ids,
        ],
        context: coda.SyncExecutionContext
      ) {
        validateProductParams({ status, published_status });

        const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
        // TODO: get an approximation for first run by using count of relation columns ?
        const defaultMaxEntriesPerRun = 50;
        const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
          defaultMaxEntriesPerRun,
          prevContinuation,
          context
        );
        if (shouldDeferBy > 0) {
          return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
        }

        const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
        const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys } =
          separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);
        const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(getMetaFieldRealFromKey);
        const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

        // Include optional nested fields. We only request these when necessary as they increase the query cost
        const optionalNestedFields = [];
        if (effectivePropertyKeys.includes('featuredImage')) optionalNestedFields.push('featuredImage');
        if (effectivePropertyKeys.includes('options')) optionalNestedFields.push('options');
        // Metafield optional nested fields
        let metafieldDefinitions: MetafieldDefinition[] = [];
        if (shouldSyncMetafields) {
          metafieldDefinitions =
            prevContinuation?.extraContinuationData?.metafieldDefinitions ??
            (await fetchMetafieldDefinitions(MetafieldOwnerType.Product, context));
          optionalNestedFields.push('metafields');
        }

        const queryFilters = {
          created_at_min: created_at ? created_at[0] : undefined,
          created_at_max: created_at ? created_at[1] : undefined,
          updated_at_min: updated_at ? updated_at[0] : undefined,
          updated_at_max: updated_at ? updated_at[1] : undefined,
          gift_card,
          ids: ids.map((gid) => graphQlGidToId(gid)),
          status,
          vendors,
          search,
          product_types,
          published_status,
        };
        // Remove any undefined filters
        Object.keys(queryFilters).forEach((key) => {
          if (queryFilters[key] === undefined) delete queryFilters[key];
        });

        const payload = {
          query: QueryProductsAdmin,
          variables: {
            maxEntriesPerRun,
            cursor: prevContinuation?.cursor ?? null,
            metafieldKeys: effectiveMetafieldKeys,
            countMetafields: effectiveMetafieldKeys.length,
            maxOptions: MAX_OPTIONS_PER_PRODUCT,
            searchQuery: buildProductsSearchQuery(queryFilters),
            includeOptions: optionalNestedFields.includes('options'),
            includeFeaturedImage: optionalNestedFields.includes('featuredImage'),
            includeMetafields: optionalNestedFields.includes('metafields'),
          } as GetProductsWithMetafieldsQueryVariables,
        };

        const { response, continuation } = await makeSyncTableGraphQlRequest(
          {
            payload,
            maxEntriesPerRun,
            prevContinuation,
            extraContinuationData: { metafieldDefinitions },
            getPageInfo: (data: any) => data.products?.pageInfo,
          },
          context
        );

        if (response && response.body.data?.products) {
          const data = response.body.data as GetProductsWithMetafieldsQuery;
          return {
            result: data.products.nodes.map((product) =>
              formatProductForSchemaFromGraphQlApi(product, context, metafieldDefinitions)
            ),
            continuation,
          };
        } else {
          return {
            result: [],
            continuation,
          };
        }
      },
      maxUpdateBatchSize: 10,
      executeUpdate: async function (args, updates, context) {
        const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(context.sync.schema);
        const { prefixedMetafieldFromKeys: schemaPrefixedMetafieldFromKeys } =
          separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);
        const effectiveMetafieldKeys = schemaPrefixedMetafieldFromKeys.map(getMetaFieldRealFromKey);
        const hasMetafieldsInSchema = !!effectiveMetafieldKeys.length;
        // TODO: fetch metafield definitions only if a metafield update is detected, and not only if metafields are present in the schema
        const metafieldDefinitions = hasMetafieldsInSchema ? await fetchMetafieldDefinitions(MetafieldOwnerType.Product, context) : [];

        const jobs = updates.map(async (update) => {
          const productGid = update.previousValue.admin_graphql_api_id as string;
          return updateProductGraphQl(
            productGid,
            effectivePropertyKeys,
            effectiveMetafieldKeys,
            metafieldDefinitions,
            update,
            context
          );
        });

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
  */

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
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Boolean,
    execute: checkProductInCollection,
  });
  */
  // #endregion
};
