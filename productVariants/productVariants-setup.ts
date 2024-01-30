// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  CACHE_MINUTE,
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
  validateProductVariantParams,
} from './productVariants-functions';

import { ProductVariantSchema, productVariantFieldDependencies } from './productVariants-schema';
import { sharedParameters } from '../shared-parameters';
import { augmentSchemaWithMetafields } from '../metafields/metafields-schema';

import { cleanQueryParams, makeSyncTableGetRequest } from '../helpers-rest';
import {
  SyncTableMixedContinuation,
  SyncTableRestAugmentedContinuation,
  SyncTableRestContinuation,
} from '../types/tableSync';
import {
  fetchMetafieldDefinitions,
  getMetaFieldRealFromKey,
  formatMetafieldsForSchema,
  separatePrefixedMetafieldsKeysFromKeys,
  makeAutocompleteMetafieldKeysFunction,
  splitMetaFieldFullKey,
  findMatchingMetafieldDefinition,
} from '../metafields/metafields-functions';
import { arrayUnique, handleFieldDependencies, wrapGetSchemaForCli } from '../helpers';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  getMixedSyncTableRemainingAndToProcessItems,
  graphQlGidToId,
  makeMixedSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { QueryProductVariantsMetafieldsAdmin, buildProductVariantsSearchQuery } from './productVariants-graphql';
import {
  GetProductVariantsMetafieldsQuery,
  GetProductVariantsMetafieldsQueryVariables,
  MetafieldDefinitionFragment,
} from '../types/admin.generated';
import { fetchProductRest } from '../products/products-functions';
import { MetafieldRestInput } from '../types/Metafields';
import { ProductVariantCreateRestParams } from '../types/ProductVariant';
import {
  UpdateCreateProp,
  getMetafieldsCreateUpdateProps,
  getVarargsMetafieldDefinitionsAndUpdateCreateProps,
  parseVarargsCreateUpdatePropsValues,
} from '../helpers-varargs';

// #endregion

/**
 * The properties that can be updated when updating a product variant.
 */
const standardUpdateProps: UpdateCreateProp[] = [
  { display: 'option 1', key: 'option1', type: 'string' },
  { display: 'option 2', key: 'option2', type: 'string' },
  { display: 'option 3', key: 'option3', type: 'string' },
  { display: 'price', key: 'price', type: 'number' },
  { display: 'sku', key: 'sku', type: 'string' },
  { display: 'position', key: 'position', type: 'number' },
  { display: 'taxable', key: 'taxable', type: 'boolean' },
  { display: 'barcode', key: 'barcode', type: 'string' },
  { display: 'weight', key: 'weight', type: 'number' },
  { display: 'weight unit', key: 'weight_unit', type: 'string' },
  { display: 'compare at price', key: 'compare_at_price', type: 'number' },
];
/**
 * The properties that can be updated when creating a product variant.
 */
const standardCreateProps = standardUpdateProps.filter((prop) => prop.key !== 'option1');

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

          metafieldDefinitions =
            prevContinuation?.extraContinuationData?.metafieldDefinitions ??
            (await fetchMetafieldDefinitions('PRODUCTVARIANT', context));
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
                  metafieldDefinitions,
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
              .map((variant) => {
                const graphQlNodeMatch = variantsData.productVariants.nodes.find(
                  (p) => graphQlGidToId(p.id) === variant.id
                );
                // if (variant.product.id === 7094974251123) {
                //   console.log('augmentedContinuation', augmentedContinuation);
                // }

                // return undefined;

                // Not included in the current response, ignored for now and it should be fetched thanks to GraphQL cursor in the next runs
                if (!graphQlNodeMatch) return;

                if (graphQlNodeMatch?.metafields?.nodes?.length) {
                  return {
                    ...variant,
                    ...formatMetafieldsForSchema(graphQlNodeMatch.metafields.nodes, metafieldDefinitions),
                  };
                }
                return variant;
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
        description: 'Option 1 of 3 of the product variant. At least one option is required.',
      }),
    ],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The product variant property to create.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions('PRODUCTVARIANT', context, CACHE_MINUTE);
          const searchObjs = standardCreateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          return coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.Number,
    execute: async function ([product_id, option1, ...varargs], context) {
      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, 'PRODUCTVARIANT', context);

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

      const params: ProductVariantCreateRestParams = {
        product_id,
        option1,
        metafields: metafieldRestInputs.length ? metafieldRestInputs : undefined,
        // images: imagesToUse ? imagesToUse.map((url) => ({ src: url })) : undefined,
      };
      standardFromKeys.forEach((key) => (params[key] = newValues[key]));

      const response = await createProductVariantRest(params, context);
      return response.body.variant.id;
    },
  });

  // UpdateProductVariant Action
  pack.addFormula({
    name: 'UpdateProductVariant',
    description: 'Update an existing Shopify product variant and return the updated data.',
    parameters: [parameters.productVariantId],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The product variant property to update.',
        autocomplete: async function (context: coda.ExecutionContext, search: string, args: any) {
          const metafieldDefinitions = await fetchMetafieldDefinitions('PRODUCTVARIANT', context, CACHE_MINUTE);
          const searchObjs = standardUpdateProps.concat(getMetafieldsCreateUpdateProps(metafieldDefinitions));
          return coda.autocompleteSearchObjects(search, searchObjs, 'display', 'key');
        },
      }),
      sharedParameters.varArgsPropValue,
    ],
    isAction: true,
    resultType: coda.ValueType.Object,
    //! withIdentity breaks relations when updating
    // schema: coda.withIdentity(ProductVariantSchema, IDENTITY_PRODUCT_VARIANT),
    schema: ProductVariantSchema,
    execute: async function ([product_variant_id, ...varargs], context) {
      // Build a Coda update object for Rest Admin and GraphQL API updates
      let update: coda.SyncUpdate<string, string, any>;

      const { metafieldDefinitions, metafieldUpdateCreateProps } =
        await getVarargsMetafieldDefinitionsAndUpdateCreateProps(varargs, 'PRODUCTVARIANT', context);
      const newValues = parseVarargsCreateUpdatePropsValues(varargs, standardUpdateProps, metafieldUpdateCreateProps);

      update = {
        previousValue: { id: product_variant_id },
        newValue: newValues,
        updatedFields: Object.keys(newValues),
      };
      update.newValue = cleanQueryParams(update.newValue);

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
