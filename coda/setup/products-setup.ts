// #region Imports
import * as coda from '@codahq/packs-sdk';

import { NotFoundVisibleError } from '../../Errors/Errors';
import { ProductGraphQl } from '../../Resources/GraphQl/Product';
import { Asset } from '../../Resources/Rest/Asset';
import { FromRow } from '../../Resources/types/Resource.types';
import { GraphQlResourceNames } from '../../Resources/types/SupportedResource';
import { CACHE_DEFAULT, DEFAULT_PRODUCT_STATUS_GRAPHQL, PACK_IDENTITIES } from '../../constants';
import { ProductRow } from '../../schemas/CodaRows.types';
import { ProductSyncTableSchemaRest } from '../../schemas/syncTable/ProductSchemaRest';
import { makeDeleteGraphQlResourceAction } from '../../utils/coda-utils';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { fetchProductTypesGraphQl } from '../../utils/products-utils';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { createOrUpdateMetafieldDescription, filters, inputs } from '../coda-parameters';
import { ProductClient } from '../../Clients/GraphQlApiClientBase';
import { ProductModel } from '../../models/graphql/ProductModel';
import { SyncedProducts } from '../../sync/graphql/SyncedProducts';

// #endregion

// #region Sync Tables
// Products Sync Table via Rest Admin API
export const Sync_Products = coda.makeSyncTable({
  name: 'Products',
  description:
    'Return Products from this shop. You can also fetch metafields that have a definition by selecting them in advanced settings.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Product,
  schema: SyncedProducts.staticSchema,
  dynamicOptions: {
    getSchema: async (context, _, formulaContext) =>
      SyncedProducts.getDynamicSchema({ context, codaSyncParams: [formulaContext.syncMetafields] }),
    defaultAddDynamicColumns: false,
    propertyOptions: async function (context) {
      if (context.propertyName === 'product_type') {
        return fetchProductTypesGraphQl(context);
      }
      if (context.propertyName === 'template_suffix') {
        return Asset.getTemplateSuffixesFor({ kind: 'product', context });
      }
    },
  },
  formula: {
    name: 'SyncProducts',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - getSchema in dynamicOptions
     *  - {@link ProductGraphQl.getDynamicSchema}
     *  - {@link ProductGraphQl.makeSyncTableManagerSyncFunction}
     */
    parameters: [
      { ...filters.general.syncMetafields, optional: true },
      { ...filters.product.productTypesArray, optional: true },
      { ...filters.general.createdAtRange, optional: true },
      { ...filters.general.updatedAtRange, optional: true },
      { ...filters.product.statusArray, optional: true },
      { ...filters.product.publishedStatus, optional: true },
      { ...filters.product.vendorsArray, optional: true },
      { ...filters.product.idArray, optional: true },
      { ...filters.product.tagsArray, optional: true },
    ],
    execute: async function (codaSyncParams, context) {
      const syncedProducts = new SyncedProducts({
        context,
        codaSyncParams,
        model: ProductModel,
        client: ProductClient.createInstance(context),
      });
      return syncedProducts.executeSync();
      // return ProductGraphQl.sync(codaSyncParams, context);
      // return Product.sync(codaSyncParams, context);
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (codaSyncParams, updates, context) {
      const syncedProducts = new SyncedProducts({
        context,
        codaSyncParams,
        model: ProductModel,
        client: ProductClient.createInstance(context),
      });
      return syncedProducts.executeSyncUpdate(updates);
      // return ProductGraphQl.syncUpdate(codaSyncParams, updates, context);
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
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('create', 'Product'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Number,
  execute: async function (
    [title, bodyHtml, productType, tags, vendor, status, handle, templateSuffix, options, metafields],
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
        status: status ?? DEFAULT_PRODUCT_STATUS_GRAPHQL,
        options: options.join(','),
      },
      // prettier-ignore
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_resource: ProductGraphQl.metafieldRestOwnerType })
      ),
    };

    const newProduct = new ProductGraphQl({ context, fromRow });
    await newProduct.saveAndUpdate();
    return newProduct.restId;
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
    {
      ...inputs.general.metafields,
      optional: true,
      description: createOrUpdateMetafieldDescription('update', 'Product'),
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  //! withIdentity is more trouble than it's worth because it breaks relations when updating
  // schema: coda.withIdentity(ProductSchemaRest, IdentitiesNew.product),
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
      metafields: CodaMetafieldSet
        .createFromCodaParameterArray(metafields)
        .map((s) => s.toMetafield({ context, owner_id: productId, owner_resource: ProductGraphQl.metafieldRestOwnerType })
      ),
    };

    const updatedProduct = new ProductGraphQl({ context, fromRow });
    await updatedProduct.saveAndUpdate();
    return updatedProduct.formatToRow();
  },
});

export const Action_DeleteProduct = makeDeleteGraphQlResourceAction(
  ProductGraphQl,
  inputs.product.id,
  ({ context, id }) => ProductGraphQl.delete({ context, id: idToGraphQlGid(GraphQlResourceNames.Product, id) })
);
// #endregion

// #region Formulas
export const Formula_Product = coda.makeFormula({
  name: 'Product',
  description: 'Return a single Product from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [inputs.product.id],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: ProductSyncTableSchemaRest,
  execute: async ([product_id], context) => {
    const response = await ProductClient.createInstance(context).single({
      id: idToGraphQlGid(GraphQlResourceNames.Product, product_id),
    });
    return ProductModel.createInstance(context, response.body).toCodaRow();

    // const product = await ProductGraphQl.find({
    //   context,
    //   id: idToGraphQlGid(GraphQlResourceNames.Product, product_id),
    // });
    // if (product) {
    //   return product.formatToRow();
    // }
    // throw new NotFoundVisibleError(PACK_IDENTITIES.Product);
  },
});

export const Format_Product: coda.Format = {
  name: 'Product',
  instructions: 'Paste the ID of the product into the column.',
  formulaName: 'Product',
  /**
  // ! regex won't work for now as it uses a different network domain.
   * {@see https://coda.io/packs/build/latest/guides/blocks/column-formats/#matchers}
   */
  // matchers: [new RegExp('^https://admin.shopify.com/store/.*/products/([0-9]+)$')],
};
// #endregion

// #region Unused stuff
/*
  // Products Sync Table via GraphQL Admin API
  pack.addSyncTable({
    name: 'ProductsGraphQL',
    description:
      'Return Products from this shop.',
    identityName: IdentitiesNew.product + '_GRAPHQL',
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
        const defaultLimit = 50;
        const { limit, shouldDeferBy } = await getGraphQlSyncTableMaxLimitAndDeferWait(
          defaultLimit,
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
            prevContinuation?.extraData?.metafieldDefinitions ??
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
            limit,
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
            limit,
            prevContinuation,
            extraData: { metafieldDefinitions },
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
