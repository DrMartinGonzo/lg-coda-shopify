// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  CODA_SUPPORTED_CURRENCIES,
  IDENTITY_PRODUCT_VARIANT,
  METAFIELD_PREFIX_KEY,
  REST_DEFAULT_API_VERSION,
  REST_DEFAULT_LIMIT,
} from '../constants';
import {
  createProductVariantRest,
  deleteProductVariantRest,
  fetchProductVariantRest,
  formatProductVariantForSchemaFromRestApi,
  handleProductVariantUpdateJob,
  updateProductVariantRest,
  validateProductVariantParams,
} from './productVariants-functions';

import { ProductVariantSchema, productVariantFieldDependencies } from '../schemas/syncTable/ProductVariantSchema';
import { sharedParameters } from '../shared-parameters';
import {
  augmentSchemaWithMetafields,
  formatMetaFieldValueForSchema,
  getMetaFieldFullKey,
  handleResourceMetafieldsUpdateGraphQlNew,
  preprendPrefixToMetaFieldKey,
} from '../metafields/metafields-functions';

import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { SyncTableMixedContinuation, SyncTableRestContinuation } from '../types/tableSync';
import {
  fetchMetafieldDefinitionsGraphQl,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
  splitMetaFieldFullKey,
} from '../metafields/metafields-functions';
import { arrayUnique, handleFieldDependencies, weightUnitsMap, wrapGetSchemaForCli } from '../helpers';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  getMixedSyncTableRemainingAndToProcessItems,
  graphQlGidToId,
  idToGraphQlGid,
  makeMixedSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { QueryProductVariantsMetafieldsAdmin, buildProductVariantsSearchQuery } from './productVariants-graphql';
import {
  GetProductVariantsMetafieldsQuery,
  GetProductVariantsMetafieldsQueryVariables,
} from '../types/admin.generated';
import { fetchProductRest } from '../products/products-functions';
import { MetafieldRestInput } from '../types/Metafields';
import { ProductVariantCreateRestParams, ProductVariantUpdateRestParams } from '../types/ProductVariant';
import { MetafieldOwnerType } from '../types/admin.types';
import { fetchShopDetails } from '../shop/shop-functions';
import { GraphQlResource } from '../types/GraphQl';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';

// #endregion

async function getProductVariantsSchema(
  context: coda.ExecutionContext,
  _: string,
  formulaContext: coda.MetadataContext
) {
  let augmentedSchema: any = ProductVariantSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(
      ProductVariantSchema,
      MetafieldOwnerType.Productvariant,
      context
    );
  }

  // TODO: need a generic setCurrencyCode function
  const shop = await fetchShopDetails(['currency'], context);
  if (shop && shop['currency']) {
    let currencyCode = shop['currency'];
    if (!CODA_SUPPORTED_CURRENCIES.includes(currencyCode)) {
      console.error(`Shop currency ${currencyCode} not supported. Falling back to USD.`);
      currencyCode = 'USD';
    }

    // Main props
    augmentedSchema.properties.price.currencyCode = currencyCode;
  }

  // admin_url should always be the last featured property, regardless of any metafield keys added previously
  augmentedSchema.featuredProperties.push('admin_url');
  return augmentedSchema;
}

const parameters = {
  productVariantId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'productVariantId',
    description: 'The Id of the product variant.',
  }),
  option1: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'option1',
    description: 'Option 1 of 3 of the product variant.',
  }),
  option2: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'option2',
    description: 'Option 2 of 3 of the product variant.',
  }),
  option3: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'option3',
    description: 'Option 3 of 3 of the product variant.',
  }),
  price: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'price',
    description: 'The product variant price.',
  }),
  compareAtPrice: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'compareAtPrice',
    description: 'The original price of the item before an adjustment or a sale.',
  }),
  sku: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'sku',
    description: 'The product variant sku.',
  }),
  position: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'position',
    description: 'The order of the product variant in the list of product variants.',
  }),
  taxable: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'taxable',
    description: 'Whether a tax is charged when the product variant is sold.',
  }),
  barcode: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'barcode',
    description: 'The barcode, UPC, or ISBN number for the product variants',
  }),
  weight: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'weight',
    description:
      "The weight of the product variant in the unit system specified with weightUnit. If you don't specify a value for weightUnit, then the shop's default unit of measurement is applied",
  }),
  weightUnit: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'weightUnit',
    autocomplete: Object.values(weightUnitsMap),
    description:
      "The unit of measurement that applies to the product variant's weight. If you don't specify a value for weight_unit, then the shop's default unit of measurement is applied.",
  }),
};

// #region Sync Tables
export const Sync_ProductVariants = coda.makeSyncTable({
  name: 'ProductVariants',
  description: 'All Shopify product variants',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_PRODUCT_VARIANT,
  schema: ProductVariantSchema,
  dynamicOptions: {
    getSchema: getProductVariantsSchema,
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncProductVariants',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [
      {
        ...sharedParameters.productType,
        description: 'Sync only variants for products of this type.',
        optional: true,
      },
      sharedParameters.optionalSyncMetafields,
      // coda.makeParameter({
      //   type: coda.ParameterType.String,
      //   name: 'collection_id',
      //   description: 'Return products by product collection ID.',
      //   optional: true,
      // }),
      {
        ...sharedParameters.filterCreatedAtRange,
        optional: true,
        description: 'Sync only variants for products created in the given date range.',
      },
      {
        ...sharedParameters.filterUpdatedAtRange,
        optional: true,
        description: 'Sync only variants for products updated in the given date range.',
      },
      {
        ...sharedParameters.filterPublishedAtRange,
        optional: true,
        description: 'Sync only variants for products published in the given date range.',
      },
      {
        ...sharedParameters.productStatusRest,
        description: 'Sync only variants for products matching these statuses.',
        optional: true,
      },
      {
        ...sharedParameters.productPublishedStatus,
        description: 'Sync only variants for products matching this published status.',
        optional: true,
      },
      {
        ...sharedParameters.productVendor,
        optional: true,
        description: 'Sync only variants for products by given vendor.',
      },
      {
        ...sharedParameters.filterHandles,
        description: 'Sync only variants for products specified by a comma-separated list of handles.',
        optional: true,
      },
      {
        ...sharedParameters.productIds,
        description: 'Sync only variants for products specified by a comma-separated list of product IDs.',
        optional: true,
      },
    ],
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
        context.sync.schema ?? (await wrapGetSchemaForCli(getProductVariantsSchema, context, { syncMetafields }));
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
        // const defaultMaxEntriesPerRun = 40;
        const syncTableMaxEntriesAndDeferWait = await getGraphQlSyncTableMaxEntriesAndDeferWait(
          defaultMaxEntriesPerRun,
          prevContinuation,
          context
        );
        maxEntriesPerRun = syncTableMaxEntriesAndDeferWait.maxEntriesPerRun;
        // maxEntriesPerRun = 40;
        restLimit = maxEntriesPerRun;
        shouldDeferBy = syncTableMaxEntriesAndDeferWait.shouldDeferBy;
        if (shouldDeferBy > 0) {
          return skipGraphQlSyncTableRun(prevContinuation, shouldDeferBy);
        }
      }

      let restItems = [];
      let restContinuation: SyncTableRestContinuation = null;
      const skipNextRestSync = prevContinuation?.extraContinuationData?.skipNextRestSync ?? false;

      // Rest Admin API Sync
      if (!skipNextRestSync) {
        const requiredProductFields = ['id', 'variants'];
        const possibleProductFields = ['id', 'title', 'status', 'images', 'handle', 'variants'];

        // Handle product variant field dependencies and only keep the ones that are actual product fields
        const syncedProductFields = arrayUnique(
          handleFieldDependencies(standardFromKeys, productVariantFieldDependencies)
            .concat(requiredProductFields)
            .filter((fromKey) => possibleProductFields.includes(fromKey))
        );

        const restParams = cleanQueryParams({
          fields: syncedProductFields.join(', '),
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

        validateProductVariantParams(restParams);

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
          restItems = response.body.products
            .map((product) =>
              product.variants.map((variant) => formatProductVariantForSchemaFromRestApi(variant, product, context))
            )
            .flat();
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
        const uniqueIdsToFetch = arrayUnique(toProcess.map((p) => p.product.id)).sort();
        const graphQlPayload = {
          query: QueryProductVariantsMetafieldsAdmin,
          variables: {
            maxEntriesPerRun,
            metafieldKeys: effectiveMetafieldKeys,
            countMetafields: effectiveMetafieldKeys.length,
            cursor: prevContinuation?.cursor,
            searchQuery: buildProductVariantsSearchQuery({ product_ids: uniqueIdsToFetch }),
          } as GetProductVariantsMetafieldsQueryVariables,
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
              getPageInfo: (data: GetProductVariantsMetafieldsQuery) => data.productVariants?.pageInfo,
            },
            context
          );

        if (augmentedResponse && augmentedResponse.body?.data) {
          const variantsData = augmentedResponse.body.data as GetProductVariantsMetafieldsQuery;
          const augmentedItems = toProcess
            .map((resource) => {
              const graphQlNodeMatch = variantsData.productVariants.nodes.find(
                (p) => graphQlGidToId(p.id) === resource.id
              );
              // if (variant.product.id === 7094974251123) {
              //   console.log('augmentedContinuation', augmentedContinuation);
              // }

              // return undefined;

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

          // console.log('🟠🟠🟠 augmentedItems.length', augmentedItems.length);

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
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: MetafieldOwnerType.Productvariant }, context)
        : [];

      const jobs = updates.map((update) => handleProductVariantUpdateJob(update, metafieldDefinitions, context));
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
export const Action_CreateProductVariant = coda.makeFormula({
  name: 'CreateProductVariant',
  description: 'Create a new Shopify Product Variant and return Product Variant Id.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    { ...sharedParameters.productId, description: 'The Id of the parent product.' },
    { ...parameters.option1, description: 'Option 1 of 3 of the product variant. At least one option is required.' },
    // optional parameters
    { ...parameters.barcode, optional: true },
    { ...parameters.compareAtPrice, optional: true },
    { ...parameters.option2, optional: true },
    { ...parameters.option3, optional: true },
    { ...parameters.position, optional: true },
    { ...parameters.price, optional: true },
    { ...parameters.sku, optional: true },
    { ...parameters.taxable, optional: true },
    { ...parameters.weight, optional: true },
    { ...parameters.weightUnit, optional: true },
    { ...sharedParameters.metafields, optional: true, description: 'Product Variant metafields to create.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity breaks relations when updating
  // schema: coda.withIdentity(ProductVariantSchema, IDENTITY_PRODUCT_VARIANT),
  schema: ProductVariantSchema,
  execute: async function (
    [
      productId,
      option1,
      barcode,
      compareAtPrice,
      option2,
      option3,
      position,
      price,
      sku,
      taxable,
      weight,
      weightUnit,
      metafields,
    ],
    context
  ) {
    const restParams: ProductVariantCreateRestParams = {
      product_id: productId,
      barcode,
      compare_at_price: compareAtPrice,
      option1,
      option2,
      option3,
      price,
      position,
      sku,
      taxable,
      weight,
      weight_unit: weightUnit,
    };

    let metafieldRestInputs: MetafieldRestInput[] = [];
    if (metafields && metafields.length) {
      metafields.forEach((m) => {
        const parsedMetafieldKeyValueSet: CodaMetafieldKeyValueSet = JSON.parse(m);
        const { metaKey, metaNamespace } = splitMetaFieldFullKey(parsedMetafieldKeyValueSet.key);
        if (parsedMetafieldKeyValueSet.value !== null) {
          const input: MetafieldRestInput = {
            namespace: metaNamespace,
            key: metaKey,
            value: JSON.stringify(parsedMetafieldKeyValueSet.value),
            type: parsedMetafieldKeyValueSet.type,
          };
          metafieldRestInputs.push(input);
        }
      });
      if (metafieldRestInputs.length) {
        restParams.metafields = metafieldRestInputs;
      }
    }

    const response = await createProductVariantRest(restParams, context);
    return response.body.variant.id;
  },
});

export const Action_UpdateProductVariant = coda.makeFormula({
  name: 'UpdateProductVariant',
  description: 'Update an existing Shopify product variant and return the updated data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    parameters.productVariantId,
    // optional parameters
    { ...parameters.barcode, optional: true },
    { ...parameters.compareAtPrice, optional: true },
    { ...parameters.option1, optional: true },
    { ...parameters.option2, optional: true },
    { ...parameters.option3, optional: true },
    { ...parameters.position, optional: true },
    { ...parameters.price, optional: true },
    { ...parameters.sku, optional: true },
    { ...parameters.taxable, optional: true },
    { ...parameters.weight, optional: true },
    { ...parameters.weightUnit, optional: true },
    { ...sharedParameters.metafields, optional: true, description: 'Product Variant metafields to update.' },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity breaks relations when updating
  // schema: coda.withIdentity(ProductVariantSchema, IDENTITY_PRODUCT_VARIANT),
  schema: ProductVariantSchema,
  execute: async function (
    [
      productVariantId,
      barcode,
      compareAtPrice,
      option1,
      option2,
      option3,
      position,
      price,
      sku,
      taxable,
      weight,
      weightUnit,
      metafields,
    ],
    context
  ) {
    const restParams: ProductVariantUpdateRestParams = {
      barcode,
      compare_at_price: compareAtPrice,
      option1,
      option2,
      option3,
      price,
      position,
      sku,
      taxable,
      weight,
      weight_unit: weightUnit,
    };

    const response = await updateProductVariantRest(productVariantId, restParams, context);
    let obj = { id: productVariantId };
    if (response.body?.variant) {
      obj = {
        ...obj,
        // TODO: find a way to pass parent product data
        ...formatProductVariantForSchemaFromRestApi(response.body.variant, {}, context),
      };
    }

    if (metafields && metafields.length) {
      const updatedMetafields = await handleResourceMetafieldsUpdateGraphQlNew(
        idToGraphQlGid(GraphQlResource.ProductVariant, productVariantId),
        'variant',
        metafields,
        context
      );
      if (updatedMetafields) {
        obj = {
          ...obj,
          ...updatedMetafields,
        };
      }
    }

    return obj;
  },
});

export const Action_DeleteProductVariant = coda.makeFormula({
  name: 'DeleteProductVariant',
  description: 'Delete an existing Shopify product and return true on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.productVariantId],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([productVariantId], context) {
    await deleteProductVariantRest(productVariantId, context);
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_ProductVariant = coda.makeFormula({
  name: 'ProductVariant',
  description: 'Get a single product variant data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.productVariantId],
  cacheTtlSecs: 10,
  resultType: coda.ValueType.Object,
  schema: ProductVariantSchema,
  execute: async ([productVariantId], context) => {
    const variantResponse = await fetchProductVariantRest(productVariantId, context);
    if (variantResponse.body.variant) {
      const productId = variantResponse.body.variant.product_id;
      const productResponse = await fetchProductRest(productId, context);
      if (productResponse.body.product) {
        return formatProductVariantForSchemaFromRestApi(
          variantResponse.body.variant,
          productResponse.body.product,
          context
        );
      }
    }
  },
});

export const Format_ProductVariant: coda.Format = {
  name: 'ProductVariant',
  instructions: 'Paste the Id of the product variant into the column.',
  formulaName: 'ProductVariant',
};
// #endregion

// #region Unused stuff
/*
  pack.addSyncTable({
    name: 'ProductVariantsGraphQL',
    description: 'All Shopify product variants',
    identityName: IDENTITY_PRODUCT_VARIANT + '_GRAPHQL',
    schema: ProductVariantSchema,
    dynamicOptions: {
      getSchema: getProductVariantsSchema,
      defaultAddDynamicColumns: false,
    },
    formula: {
      name: 'SyncProductVariantsGraphQL',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        {
          ...sharedParameters.productType,
          description: 'Sync only variants for products of this type.',
          optional: true,
        },
        sharedParameters.optionalSyncMetafields,
        {
          ...sharedParameters.filterCreatedAtRange,
          optional: true,
          description: 'Sync only variants for products created in the given date range.',
        },
        {
          ...sharedParameters.filterUpdatedAtRange,
          optional: true,
          description: 'Sync only variants for products updated in the given date range.',
        },
        {
          ...sharedParameters.filterPublishedAtRange,
          optional: true,
          description: 'Sync only variants for products published in the given date range.',
        },
        {
          ...sharedParameters.productStatusRest,
          description: 'Sync only variants for products matching these statuses.',
          optional: true,
        },
        {
          ...sharedParameters.productPublishedStatus,
          description: 'Sync only variants for products matching this published status.',
          optional: true,
        },
        {
          ...sharedParameters.productVendor,
          optional: true,
          description: 'Sync only variants for products by given vendor.',
        },
        {
          ...sharedParameters.filterHandles,
          description: 'Sync only variants for products specified by a comma-separated list of handles.',
          optional: true,
        },
        {
          ...sharedParameters.productIds,
          description: 'Sync only variants for products specified by a comma-separated list of product IDs.',
          optional: true,
        },
      ],
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
          context.sync.schema ?? (await wrapGetSchemaForCli(getProductVariantsSchema, context, { syncMetafields }));
        const prevContinuation = context.sync.continuation as SyncTableRestAugmentedContinuation;
        const effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(schema);
        const { prefixedMetafieldFromKeys: effectivePrefixedMetafieldPropertyKeys, standardFromKeys } =
          separatePrefixedMetafieldsKeysFromKeys(effectivePropertyKeys);

        const effectiveMetafieldKeys = effectivePrefixedMetafieldPropertyKeys.map(getMetaFieldRealFromKey);
        const shouldSyncMetafields = !!effectiveMetafieldKeys.length;

        let restLimit = REST_DEFAULT_LIMIT;
        let maxEntriesPerRun = restLimit;
        let shouldDeferBy = 0;
        let metafieldDefinitions: MetafieldDefinition[] = [];

        if (shouldSyncMetafields) {
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

          // restLimit = defaultMaxEntriesPerRun;
          // maxEntriesPerRun = defaultMaxEntriesPerRun;

          metafieldDefinitions =
            prevContinuation?.extraContinuationData?.metafieldDefinitions ??
            (await fetchMetafieldDefinitions(MetafieldOwnerType.Productvariant, context));
        }

        const requiredProductFields = ['id', 'variants'];
        const possibleProductFields = ['id', 'title', 'status', 'images', 'handle', 'variants'];

        // Handle product variant field dependencies and only keep the ones that are actual product fields
        const syncedProductFields = arrayUnique(
          handleFieldDependencies(standardFromKeys, productVariantFieldDependencies)
            .concat(requiredProductFields)
            .filter((fromKey) => possibleProductFields.includes(fromKey))
        );

        const restParams = cleanQueryParams({
          fields: syncedProductFields.join(', '),
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

        validateProductVariantParams(restParams);

        let url: string;
        if (prevContinuation?.nextUrl) {
          url = coda.withQueryParams(prevContinuation.nextUrl, { limit: restParams.limit });
        } else {
          url = coda.withQueryParams(
            `${context.endpoint}/admin/api/${REST_DEFAULT_API_VERSION}/products.json`,
            restParams
          );
        }

        let restItems = prevContinuation?.remainingRestItems ?? [];
        let restContinuation: SyncTableRestContinuation = null;
        // Only run Rest Sync if there are no previous rest items to process with GraphQL
        if (restItems.length === 0) {
          const { response, continuation } = await makeSyncTableGetRequest({ url }, context);
          restContinuation = continuation;

          if (response && response.body?.products) {
            restItems = response.body.products
              .map((product) =>
                product.variants.map((variant) => formatProductVariantForSchemaFromRestApi(variant, product, context))
              )
              .flat();
          }

          if (!shouldSyncMetafields) {
            return {
              result: restItems,
              continuation: restContinuation,
            };
          }
        }

        // Now we will sync metafields
        // const stillProcessingRestItems = prevContinuation?.remainingRestItems;
        // let restItemsToprocess = restItems;
        // let remainingRestItems = restItems;

        // if (prevContinuation?.cursor) {
        //   logAdmin(`🔁 Fetching remaining graphQL results from current batch`);
        // } else {
        //   if (stillProcessingRestItems) {
        //     logAdmin(`🔁 Fetching next batch of ${restItems.length} Variants`);
        //   } else {
        //     logAdmin(`🟢 Found ${restItems.length} Variants to augment with metafields`);
        //   }

        //   restItemsToprocess = restItems.splice(0, maxEntriesPerRun);
        //   remainingRestItems = restItems;
        // }

        const { restItemsToprocess, remainingRestItems } = getMixedSyncTableRemainingAndToProcessItems(
          prevContinuation,
          restItems,
          maxEntriesPerRun
        );
        const uniqueProductIdsToFetch = arrayUnique(restItemsToprocess.map((p) => p.product.id));
        const payload = {
          query: QueryProductVariantsMetafieldsAdmin,
          variables: {
            maxEntriesPerRun,
            metafieldKeys: effectiveMetafieldKeys,
            countMetafields: effectiveMetafieldKeys.length,
            cursor: prevContinuation?.cursor,
            searchQuery: buildProductVariantsSearchQuery({ product_ids: uniqueProductIdsToFetch }),
          } as GetProductVariantsMetafieldsQueryVariables,
        };

        let { response: augmentedResponse, continuation: augmentedContinuation } =
          await makeAugmentedSyncTableGraphQlRequest(
            {
              payload,
              maxEntriesPerRun,
              prevContinuation: prevContinuation as unknown as SyncTableRestAugmentedContinuation,
              nextRestUrl: prevContinuation?.prevRestNextUrl ?? restContinuation?.nextUrl,
              extraContinuationData: {
                metafieldDefinitions,
              },
            },
            context
          );

        // let { response: augmentedResponse, continuation: augmentedContinuation } =
        //   await makeMixedSyncTableGraphQlRequest(
        //     {
        //       payload,
        //       maxEntriesPerRun,
        //       prevContinuation: prevContinuation as unknown as SyncTableRestAugmentedContinuation,
        //       nextRestUrl: prevContinuation?.prevRestNextUrl ?? restContinuation?.nextUrl,
        //       extraContinuationData: {
        //         metafieldDefinitions,
        //       },
        //       remainingRestItems: remainingRestItems,
        //       getPageInfo: (data: any) => data.productVariants?.pageInfo,
        //     },
        //     context
        //   );

        // console.log('augmentedResponse', augmentedResponse);

        if (augmentedResponse && augmentedResponse.body?.data) {
          const augmentedItems = restItemsToprocess
            .map((variant) => {
              const graphQlNodeMatch = augmentedResponse.body.data.productVariants.nodes.find(
                (p: GetProductVariantsMetafieldsQuery['productVariants']['nodes'][number]) =>
                  graphQlGidToId(p.id) === variant.id
              );

              // return undefined;

              // the variant is not included in the current response, it should be ignored for now and it should be fetched thanks to cursor in the subsequent runs
              if (!graphQlNodeMatch) return;

              if (graphQlNodeMatch?.metafields?.nodes?.length) {
                return {
                  ...variant,
                  ...formatMetafieldsForSchema(graphQlNodeMatch.metafields.nodes),
                };
              }
              return variant;
            })
            // filter out undefined items
            .filter((p) => p);

          const { hasNextPage } = augmentedResponse.body.data.productVariants.pageInfo;
          if (hasNextPage || remainingRestItems.length) {
            // @ts-ignore
            augmentedContinuation = {
              graphQlLock: 'true',
              retries: 0,
              extraContinuationData: {
                metafieldDefinitions,
              },
              cursor: hasNextPage ? augmentedResponse.body.data.productVariants.pageInfo.endCursor : undefined,
              remainingRestItems: remainingRestItems,
              prevRestNextUrl: prevContinuation?.prevRestNextUrl ?? restContinuation?.nextUrl,
              lastCost: {
                requestedQueryCost: augmentedResponse.body.extensions.cost.requestedQueryCost,
                actualQueryCost: augmentedResponse.body.extensions.cost.actualQueryCost,
              },
              lastMaxEntriesPerRun: maxEntriesPerRun,
              lastThrottleStatus: augmentedResponse.body.extensions.cost.throttleStatus,
            };
          }

          return {
            result: augmentedItems,
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
        const metafieldDefinitions = hasUpdatedMetaFields
          ? await fetchMetafieldDefinitions(MetafieldOwnerType.Productvariant, context)
          : [];

        const jobs = updates.map((update) => handleProductVariantUpdateJob(update, metafieldDefinitions, context));
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
// #endregion
