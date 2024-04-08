// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FromRow } from '../../Fetchers/NEW/AbstractResource_Synced';
import { Metafield } from '../../Fetchers/NEW/Resources/Metafield';
import { Product } from '../../Fetchers/NEW/Resources/WithGraphQlMetafields/Product';
import { Variant } from '../../Fetchers/NEW/Resources/WithGraphQlMetafields/Variant';
import { CACHE_DEFAULT, Identity } from '../../constants';
import { ProductVariantRow } from '../../schemas/CodaRows.types';
import { formatProductReference } from '../../schemas/syncTable/ProductSchemaRest';
import { ProductVariantSyncTableSchema } from '../../schemas/syncTable/ProductVariantSchema';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../../shared-parameters';
import { parseMetafieldsCodaInput } from '../metafields/utils/metafields-utils-keyValueSets';

// #endregion

// #region Sync Tables
export const Sync_ProductVariants = coda.makeSyncTable({
  name: 'ProductVariants',
  description:
    'Return ProductVariants from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.ProductVariant,
  schema: ProductVariantSyncTableSchema,
  dynamicOptions: {
    // getSchema: getProductVariantSchema,
    getSchema: async function (context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
      return Variant.getDynamicSchema({ context, codaSyncParams: [, formulaContext.syncMetafields] });
    },
    defaultAddDynamicColumns: false,
  },
  formula: {
    name: 'SyncProductVariants',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema method in dynamicOptions.
     *  - {@link Variant.getDynamicSchema}
     *  - {@link Product.generateSharedSyncFunction}
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
      /** We sync from Product class in order to have parent product information */
      return Product.syncVariants(params, context);
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
    const metafieldSets = parseMetafieldsCodaInput(metafields);
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
      metafields: metafieldSets.map((set) => Metafield.createInstancesFromMetafieldSet(context, set)),
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
  // schema: coda.withIdentity(ProductVariantSchema, Identity.ProductVariant),
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
    const metafieldSets = parseMetafieldsCodaInput(metafields);
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
      metafields: metafieldSets.map((set) => Metafield.createInstancesFromMetafieldSet(context, set)),
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

export const Action_DeleteProductVariant = coda.makeFormula({
  name: 'DeleteProductVariant',
  description: 'Delete an existing Shopify product and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.productVariant.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([productVariantId], context) {
    await Variant.delete({ id: productVariantId, context });
    return true;
  },
});
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

      return variant.formatToRow();
    }
  },
});

export const Format_ProductVariant: coda.Format = {
  name: 'ProductVariant',
  instructions: 'Paste the ID of the product variant into the column.',
  formulaName: 'ProductVariant',
};
// #endregion

// #region Unused stuff
/*
  pack.addSyncTable({
    name: 'ProductVariantsGraphQL',
    description: 'Return ProductVariants from this shop.',
    identityName: Identity.ProductVariant + '_GRAPHQL',
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
        {...sharedFilters.general.optionalSyncMetafields, optional:true},
        {
          ...sharedFilters.general.filterCreatedAtRange,
          optional: true,
          description: 'Sync only variants for products created in the given date range.',
        },
        {
          ...sharedFilters.general.filterUpdatedAtRange,
          optional: true,
          description: 'Sync only variants for products updated in the given date range.',
        },
        {
          ...sharedFilters.general.filterPublishedAtRange,
          optional: true,
          description: 'Sync only variants for products published in the given date range.',
        },
        {
          ...sharedParameters.productStatusRest,
          description: 'Sync only variants for products matching these statuses.',
          optional: true,
        },
        { ...sharedFilterParameters.productPublishedStatus, optional: true },
        { ...sharedFilterParameters.filterVendor, optional: true },
        {
          ...sharedParameters.filterHandles,
          description: 'Sync only variants for products specified by a comma-separated list of handles.',
          optional: true,
        },
        {
          ...sharedInputs.product.ids,
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

          if (response?.body?.products) {
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

        if (augmentedResponse?.body?.data) {
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
