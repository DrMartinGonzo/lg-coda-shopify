// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  CACHE_DEFAULT,
  DEFAULT_PRODUCT_OPTION_NAME,
  DEFAULT_PRODUCT_STATUS_REST,
  IDENTITY_PRODUCT,
  METAFIELD_PREFIX_KEY,
  OPTIONS_PRODUCT_STATUS_REST,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  fetchSingleProductRest,
  formatProductForSchemaFromRestApi,
  validateProductParams,
  createProductRest,
  fetchProductTypesGraphQl,
  deleteProductRest,
  handleProductUpdateJob,
  updateProductRest,
} from './products-functions';
import { ProductSyncTableSchemaRest, productFieldDependencies } from '../schemas/syncTable/ProductSchemaRest';
import { QueryProductsMetafieldsAdmin, buildProductsSearchQuery } from './products-graphql';
import { filters, inputs } from '../shared-parameters';

import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  getMixedSyncTableRemainingAndToProcessItems,
  graphQlGidToId,
  idToGraphQlGid,
  makeMixedSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  formatMetafieldRestInputFromMetafieldKeyValueSet,
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
  updateAndFormatResourceMetafieldsGraphQl,
} from '../metafields/metafields-functions';
import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../metafields/metafields-functions';

// Import types
import { GetProductsMetafieldsQuery, GetProductsMetafieldsQueryVariables } from '../types/admin.generated';
import { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';
import { ProductSyncTableRestParams, ProductCreateRestParams, ProductUpdateRestParams } from '../types/Product';
import { arrayUnique, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import { MetafieldOwnerType } from '../types/admin.types';
import { getTemplateSuffixesFor, makeAutocompleteTemplateSuffixesFor } from '../themes/themes-functions';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { fetchMetafieldDefinitionsGraphQl } from '../metafieldDefinitions/metafieldDefinitions-functions';
import { ObjectSchemaDefinitionType } from '@codahq/packs-sdk/dist/schema';

// #endregion

async function getProductSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  let augmentedSchema = ProductSyncTableSchemaRest;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(
      ProductSyncTableSchemaRest,
      MetafieldOwnerType.Product,
      context
    );
  }
  // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

// #region Sync Tables
// Products Sync Table via Rest Admin API
export const Sync_Products = coda.makeSyncTable({
  name: 'Products',
  description:
    'Return Products from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_PRODUCT,
  schema: ProductSyncTableSchemaRest,
  dynamicOptions: {
    getSchema: getProductSchema,
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'product_type') {
        return fetchProductTypesGraphQl(context);
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
      { ...filters.product.productType, optional: true },
      { ...filters.general.syncMetafields, optional: true },
      { ...filters.general.createdAtRange, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.general.publishedAtRange, optional: true },
      { ...filters.product.statusArray, optional: true },
      { ...filters.product.publishedStatus, optional: true },
      { ...filters.product.vendor, optional: true },
      { ...filters.general.handleArray, optional: true },
      { ...filters.product.idArray, optional: true },
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
      const schema = context.sync.schema ?? (await wrapGetSchemaForCli(getProductSchema, context, { syncMetafields }));
      const prevContinuation = context.sync.continuation as SyncTableMixedContinuation;
      const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
      const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
        separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

      const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(removePrefixFromMetaFieldKey);
      const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

      let restLimit = REST_DEFAULT_LIMIT;
      let maxEntriesPerRun = restLimit;
      let shouldDeferBy = 0;

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
      }

      let restItems: Array<ObjectSchemaDefinitionType<any, any, typeof ProductSyncTableSchemaRest>> = [];
      let restContinuation: SyncTableRestContinuation | null = null;
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

        if (response?.body?.products) {
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
                currentBatch: {
                  remaining: remaining,
                  processing: toProcess,
                },
              },
              getPageInfo: (data: GetProductsMetafieldsQuery) => data.products?.pageInfo,
            },
            context
          );

        if (augmentedResponse?.body?.data) {
          const productsData = augmentedResponse.body.data as GetProductsMetafieldsQuery;
          const augmentedItems = toProcess
            .map((resource) => {
              const graphQlNodeMatch = productsData.products.nodes.find((c) => graphQlGidToId(c.id) === resource.id);

              // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
              if (!graphQlNodeMatch) return;

              if (graphQlNodeMatch?.metafields?.nodes?.length) {
                graphQlNodeMatch.metafields.nodes.forEach((metafield) => {
                  const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
                  resource[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
                });
              }
              return resource;
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
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Product }, context)
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
    { ...inputs.product.imageUrls, optional: true },
    { ...inputs.general.metafields, optional: true, description: 'Product metafields to create.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function (
    [title, bodyHtml, productType, tags, vendor, status, handle, templateSuffix, options, imageUrls, metafields],
    context
  ) {
    const restParams: ProductCreateRestParams = {
      title,
      body_html: bodyHtml,
      handle,
      product_type: productType,
      tags: tags ? tags.join(',') : undefined,
      template_suffix: templateSuffix,
      vendor,
      status,
      options: options ? options.map((option) => ({ name: option, values: [DEFAULT_PRODUCT_OPTION_NAME] })) : undefined,
      images: imageUrls ? imageUrls.map((url) => ({ src: url })) : undefined,
    };
    // We need to add a default variant to the product if some options are defined
    if (restParams.options && Array.isArray(restParams.options) && restParams.options.length) {
      restParams.variants = [
        {
          option1: DEFAULT_PRODUCT_OPTION_NAME,
          option2: DEFAULT_PRODUCT_OPTION_NAME,
          option3: DEFAULT_PRODUCT_OPTION_NAME,
        },
      ];
    }
    if (!restParams.status) {
      restParams.status = DEFAULT_PRODUCT_STATUS_REST;
    }

    if (metafields && metafields.length) {
      const parsedMetafieldKeyValueSets: CodaMetafieldKeyValueSet[] = metafields.map((m) => JSON.parse(m));
      const metafieldRestInputs = parsedMetafieldKeyValueSets
        .map(formatMetafieldRestInputFromMetafieldKeyValueSet)
        .filter(Boolean);
      if (metafieldRestInputs.length) {
        restParams.metafields = metafieldRestInputs;
      }
    }

    const response = await createProductRest(restParams, context);
    return response.body.product.id;
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
    { ...inputs.general.metafields, optional: true, description: 'Product metafields to update.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(ProductSchemaRest, IDENTITY_PRODUCT),
  schema: ProductSyncTableSchemaRest,
  execute: async function (
    [productId, title, bodyHtml, productType, tags, vendor, status, handle, templateSuffix, metafields],
    context
  ) {
    const restParams: ProductUpdateRestParams = {
      body_html: bodyHtml,
      handle,
      product_type: productType,
      tags: tags ? tags.join(',') : undefined,
      template_suffix: templateSuffix,
      title,
      vendor,
      status,
    };

    const promises: (Promise<any> | undefined)[] = [];
    promises.push(updateProductRest(productId, restParams, context));
    if (metafields && metafields.length) {
      promises.push(
        updateAndFormatResourceMetafieldsGraphQl(
          {
            ownerGid: idToGraphQlGid(GraphQlResource.Product, productId),
            metafieldKeyValueSets: metafields.map((s) => JSON.parse(s)),
            schemaWithIdentity: false,
          },
          context
        )
      );
    } else {
      promises.push(undefined);
    }

    const [restResponse, updatedFormattedMetafields] = await Promise.all(promises);
    const obj = {
      id: productId,
      ...(restResponse?.body?.product ? formatProductForSchemaFromRestApi(restResponse.body.product, context) : {}),
      ...(updatedFormattedMetafields ?? {}),
    };

    return obj;
  },
});

export const Action_DeleteProduct = coda.makeFormula({
  name: 'DeleteProduct',
  description: 'Delete an existing Shopify product and return true on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.product.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([productId], context) {
    await deleteProductRest(productId, context);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Product = coda.makeFormula({
  name: 'Product',
  description: 'Get a single product data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.product.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: ProductSyncTableSchemaRest,
  execute: async ([productId], context) => {
    const response = await fetchSingleProductRest(productId, context);
    if (response?.body?.product) {
      return formatProductForSchemaFromRestApi(response.body.product, context);
    }
  },
});

// TODO: add link regex ?
export const Format_Product: coda.Format = {
  name: 'Product',
  instructions: 'Paste the ID of the product into the column.',
  formulaName: 'Product',
  // matchers: [new RegExp('^https://.*myshopify.com/admin/products/([0-9]+)$')],
};
// #endregion

// #region Unused stuff
/*
  // Products Sync Table via GraphQL Admin API
  pack.addSyncTable({
    name: 'ProductsGraphQL',
    description:
      'Return Products from this shop.',
    identityName: IDENTITY_PRODUCT + '_GRAPHQL',
    schema: ProductSyncTableSchemaGraphQl,
    dynamicOptions: {
      getSchema: async function (context, _, { syncMetafields }) {
        let augmentedSchema: any = ProductSyncTableSchemaGraphQl;
        if (syncMetafields) {
          augmentedSchema = await augmentSchemaWithMetafields(ProductSyncTableSchemaGraphQl, MetafieldOwnerType.Product, context);
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
        { ...sharedFilters.general.filterCreatedAtRange, optional: true },
        { ...sharedFilters.general.filterUpdatedAtRange, optional: true },
        {...sharedFilters.general.optionalSyncMetafields, optional:true},
        // { ...sharedFilters.general.filterPublishedAtRange, optional: true },
        {
          ...parameters.status,
          description: 'Return only products matching these statuses.',
          optional: true,
        },
        { ...sharedParameters.productPublishedStatus, optional: true, },
        { ...sharedFilterParameters.filterVendor, optional: true },
        {
          ...parameters.giftCard,
          description: 'Return only products marked as gift cards.',
          optional: true,
        },
        {
          ...sharedFilters.product.idArray,
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

        if (response?.body?.data?.products) {
          const data = response.body.data as GetProductsWithMetafieldsQuery;
          return {
            result: data.products.nodes.map((product) =>
              formatProductForSchemaFromGraphQlApi(product, context)
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
    cacheTtlSecs: CACHE_DEFAULT,
    resultType: coda.ValueType.Boolean,
    execute: checkProductInCollection,
  });
  */
// #endregion
