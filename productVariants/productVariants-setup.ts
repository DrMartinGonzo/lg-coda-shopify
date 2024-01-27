// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
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
import { handleResourceMetafieldsUpdate } from '../metafields/metafields-functions';

import { ProductVariantSchema, productVariantFieldDependencies } from './productVariants-schema';
import { sharedParameters } from '../shared-parameters';
import { augmentSchemaWithMetafields } from '../metafields/metafields-schema';

import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import { SyncTableRestAugmentedContinuation, SyncTableRestContinuation } from '../types/tableSync';
import {
  fetchMetafieldDefinitions,
  getMetaFieldRealFromKey,
  formatMetafieldsForSchema,
  separatePrefixedMetafieldsKeysFromKeys,
  makeAutocompleteMetafieldKeysFunction,
  splitMetaFieldFullKey,
} from '../metafields/metafields-functions';
import { arrayUnique, getUnitMap, handleFieldDependencies, logAdmin, wrapGetSchemaForCli } from '../helpers';
import { MetafieldDefinition } from '../types/admin.types';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  graphQlGidToId,
  idToGraphQlGid,
  makeAugmentedSyncTableGraphQlRequest,
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

// #endregion

async function getProductVariantsSchema(
  context: coda.ExecutionContext,
  _: string,
  formulaContext: coda.MetadataContext
) {
  let augmentedSchema: any = ProductVariantSchema;
  if (formulaContext.syncMetafields) {
    augmentedSchema = await augmentSchemaWithMetafields(ProductVariantSchema, 'PRODUCTVARIANT', context);
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
  metafieldKey: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'metafieldKey',
    description: 'The metafield field key',
    autocomplete: makeAutocompleteMetafieldKeysFunction('PRODUCTVARIANT'),
  }),
};

export const setupProductVariants = (pack: coda.PackDefinitionBuilder) => {
  // #region Sync Tables
  pack.addSyncTable({
    name: 'ProductVariants',
    description: 'All Shopify product variants',
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
            (await fetchMetafieldDefinitions('PRODUCTVARIANT', context));
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

        let restItems = prevContinuation?.prevRestItems ?? [];
        let restContinuation: SyncTableRestContinuation = null;
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
        const stillProcessingRestItems = prevContinuation?.prevRestItems;
        let restItemsToprocess = restItems;
        let remainingRestItems = restItems;

        if (prevContinuation?.cursor) {
          logAdmin(`🔁 Fetching remaining graphQL results from current batch`);
        } else {
          if (stillProcessingRestItems) {
            logAdmin(`🔁 Fetching next batch of ${restItems.length} Variants`);
          } else {
            logAdmin(`🟢 Found ${restItems.length} Variants to augment with metafields`);
          }

          restItemsToprocess = restItems.splice(0, maxEntriesPerRun);
          remainingRestItems = restItems;
        }

        const uniqueProductIdsToFetch = arrayUnique(restItemsToprocess.map((p) => p.product.id));

        const payload = {
          query: QueryProductVariantsMetafieldsAdmin,
          variables: {
            maxEntriesPerRun,
            metafieldKeys: effectiveMetafieldKeys,
            countMetafields: effectiveMetafieldKeys.length,
            cursor: prevContinuation?.cursor,
            searchQuery: buildProductVariantsSearchQuery({
              product_ids: uniqueProductIdsToFetch,
            }),
          } as GetProductVariantsMetafieldsQueryVariables,
        };

        let { response: augmentedResponse, continuation: augmentedContinuation } =
          await makeAugmentedSyncTableGraphQlRequest(
            {
              payload,
              maxEntriesPerRun,
              prevContinuation: prevContinuation as unknown as SyncTableRestAugmentedContinuation,
              restNextUrl: prevContinuation?.prevRestNextUrl ?? restContinuation?.nextUrl,
              extraContinuationData: {
                metafieldDefinitions,
              },
            },
            context
          );

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
                  ...formatMetafieldsForSchema(graphQlNodeMatch.metafields.nodes, metafieldDefinitions),
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
              prevRestItems: remainingRestItems,
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
          ? await fetchMetafieldDefinitions('PRODUCTVARIANT', context)
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
  // CreateProductVariant Action
  pack.addFormula({
    name: 'CreateProductVariant',
    description: 'Create a new Shopify Product Variant and return Product Variant Id.',
    parameters: [
      { ...sharedParameters.productId, description: 'The Id of the parent product.' },
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'option1',
        description: 'Option 1 of 3 of the product variant.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'option2',
        description: 'Option 2 of 3 of the product variant.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'option3',
        description: 'Option 3 of 3 of the product variant.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'price',
        description: 'The product variant price.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'sku',
        description: 'The product variant sku.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'position',
        description: 'The order of the product variant in the list of product variants.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.Boolean,
        name: 'taxable',
        description: 'Whether a tax is charged when the product variant is sold.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'barcode',
        description: 'The barcode, UPC, or ISBN number for the product variants',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'weight',
        description:
          "The weight of the product variant in the unit system specified with weightUnit. If you don't specify a value for weightUnit, then the shop's default unit of measurement is applied",
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'weightUnit',
        description: "The unit of measurement that applies to the product variant's weight.",
        optional: true,
        autocomplete: Object.values(getUnitMap('weight')),
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'compareAtPrice',
        description: 'The original price of the item before an adjustment or a sale.',
        optional: true,
      }),
    ],
    varargParameters: [parameters.metafieldKey, sharedParameters.metafieldValue],
    isAction: true,
    resultType: coda.ValueType.Number,
    execute: async function (
      [
        product_id,
        option1,
        option2,
        option3,
        price,
        sku,
        position,
        taxable,
        barcode,
        weight,
        weight_unit,
        compare_at_price,
        ...varargs
      ],
      context
    ) {
      // if (imagesUrls !== undefined && images !== undefined)
      //   throw new coda.UserVisibleError("Provide either 'imagesFromCoda' or 'imagesUrls', not both");

      let metafieldRestInputs: MetafieldRestInput[] = [];
      if (varargs && varargs.length) {
        const metafieldDefinitions = await fetchMetafieldDefinitions('PRODUCTVARIANT', context);
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

      // const imagesToUse = imagesUrls ? imagesUrls : images;
      const params: ProductVariantCreateRestParams = {
        product_id,
        option1,
        option2,
        option3,
        price,
        sku,
        position,
        taxable,
        barcode,
        weight,
        weight_unit,
        compare_at_price,
        metafields: metafieldRestInputs.length ? metafieldRestInputs : undefined,

        // images: imagesToUse ? imagesToUse.map((url) => ({ src: url })) : undefined,
      };

      const response = await createProductVariantRest(params, context);
      return response.body.variant.id;
    },
  });

  // UpdateProductVariant Action
  pack.addFormula({
    name: 'UpdateProductVariant',
    description: 'Update an existing Shopify product variant and return the updated data.',
    parameters: [
      { ...parameters.productVariantId },
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'option1',
        description: 'Option 1 of 3 of the product variant.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'option2',
        description: 'Option 2 of 3 of the product variant.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'option3',
        description: 'Option 3 of 3 of the product variant.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'price',
        description: 'The product variant price.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'sku',
        description: 'The product variant sku.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'position',
        description: 'The order of the product variant in the list of product variants.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.Boolean,
        name: 'taxable',
        description: 'Whether a tax is charged when the product variant is sold.',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'barcode',
        description: 'The barcode, UPC, or ISBN number for the product variants',
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'weight',
        description:
          "The weight of the product variant in the unit system specified with weightUnit. If you don't specify a value for weightUnit, then the shop's default unit of measurement is applied",
        optional: true,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'weightUnit',
        description: "The unit of measurement that applies to the product variant's weight.",
        optional: true,
        autocomplete: Object.values(getUnitMap('weight')),
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'compareAtPrice',
        description: 'The original price of the item before an adjustment or a sale.',
        optional: true,
      }),
    ],
    varargParameters: [parameters.metafieldKey, sharedParameters.metafieldValue],
    isAction: true,
    resultType: coda.ValueType.Object,
    //! withIdentity breaks relations when updating
    // schema: coda.withIdentity(ProductVariantSchema, IDENTITY_PRODUCT_VARIANT),
    schema: ProductVariantSchema,
    execute: async function (
      [
        product_variant_id,
        option1,
        option2,
        option3,
        price,
        sku,
        position,
        taxable,
        barcode,
        weight,
        weight_unit,
        compare_at_price,
        ...varargs
      ],
      context
    ) {
      // Build a Coda update object for Rest Admin and GraphQL API updates
      let update: coda.SyncUpdate<string, string, typeof ProductVariantSchema>;

      const cleanedRestParams: ProductVariantUpdateRestParams = cleanQueryParams({
        option1,
        option2,
        option3,
        price,
        sku,
        position,
        taxable,
        barcode,
        weight,
        weight_unit,
        compare_at_price,
      });

      update = {
        previousValue: {
          id: product_variant_id,
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
        metafieldDefinitions = await fetchMetafieldDefinitions('PRODUCTVARIANT', context);
      }

      return handleProductVariantUpdateJob(update, metafieldDefinitions, context);
    },
  });

  // DeleteProductVariant Action
  pack.addFormula({
    name: 'DeleteProductVariant',
    description: 'Delete an existing Shopify product and return true on success.',
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
  pack.addFormula({
    name: 'ProductVariant',
    description: 'Get a single product variant data.',
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
  // #endregion

  // #region Column formats
  pack.addColumnFormat({
    name: 'ProductVariant',
    instructions: 'Paste the Id of the product variant into the column.',
    formulaName: 'ProductVariant',
  });
  // #endregion
};
