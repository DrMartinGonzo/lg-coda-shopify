// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CodaMetafieldKeyValueSetNew } from '../CodaMetafieldKeyValueSet';
import { FromRow } from '../../Resources/AbstractResource_Synced';
import { Product } from '../../Resources/Rest/Product';
import { CACHE_DEFAULT, DEFAULT_PRODUCT_STATUS_REST, Identity } from '../../constants';
import { ProductRow } from '../../schemas/CodaRows.types';
import { ProductSyncTableSchemaRest } from '../../schemas/syncTable/ProductSchemaRest';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';
import { getTemplateSuffixesFor } from '../../utils/themes-utils';
import { fetchProductTypesGraphQl } from '../../utils/products-utils';

// #endregion

// #region Sync Tables
// Products Sync Table via Rest Admin API
export const Sync_Products = coda.makeSyncTable({
  name: 'Products',
  description:
    'Return Products from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: Identity.Product,
  schema: ProductSyncTableSchemaRest,
  dynamicOptions: {
    getSchema: async function (context, _, formulaContext) {
      return Product.getDynamicSchema({ context, codaSyncParams: [, formulaContext.syncMetafields] });
    },
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
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link Product.getDynamicSchema}
     *  - {@link Product.generateSharedSyncFunction}
     */
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
    execute: async function (params, context) {
      return Product.sync(params, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      return Product.syncUpdate(params, updates, context);
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
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('create', 'Product'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function (
    [title, bodyHtml, productType, tags, vendor, status, handle, templateSuffix, options, imageUrls, metafields],
    context
  ) {
    const fromRow: FromRow<ProductRow> = {
      row: {
        title,
        body_html: bodyHtml,
        handle,
        product_type: productType,
        tags: tags ? tags.join(',') : undefined,
        template_suffix: templateSuffix,
        vendor,
        status: status ?? DEFAULT_PRODUCT_STATUS_REST,
        options: options.join(','),
        images: imageUrls,
      },
      // prettier-ignore
      metafields: CodaMetafieldKeyValueSetNew
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_resource: Product.metafieldRestOwnerType })
      ),
    };

    const newProduct = new Product({ context, fromRow });
    await newProduct.saveAndUpdate();
    return newProduct.apiData.id;
  },
});

// TODO: update image urls ?
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
  // schema: coda.withIdentity(ProductSchemaRest, Identity.Product),
  schema: ProductSyncTableSchemaRest,
  execute: async function (
    [productId, title, body_html, product_type, tags, vendor, status, handle, template_suffix, metafields],
    context
  ) {
    const fromRow: FromRow<ProductRow> = {
      row: {
        id: productId,
        body_html,
        handle,
        product_type,
        tags: tags ? tags.join(',') : undefined,
        template_suffix,
        title,
        vendor,
        status,
      },
      // prettier-ignore
      metafields: CodaMetafieldKeyValueSetNew
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_id: productId, owner_resource: Product.metafieldRestOwnerType })
      ),
    };

    const updatedProduct = new Product({ context, fromRow });
    await updatedProduct.saveAndUpdate();
    return updatedProduct.formatToRow();
  },
});

export const Action_DeleteProduct = coda.makeFormula({
  name: 'DeleteProduct',
  description: 'Delete an existing Shopify product and return `true` on success.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.product.id],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async function ([productId], context) {
    await Product.delete({ id: productId, context });
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
    const product = await Product.find({ id: productId, context });
    return product.formatToRow();
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
    identityName: Identity.Product + '_GRAPHQL',
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
        context
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