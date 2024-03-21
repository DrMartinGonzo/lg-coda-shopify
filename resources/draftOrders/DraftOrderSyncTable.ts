import * as coda from '@codahq/packs-sdk';

import { SyncTableParamValues, SyncTableRest } from '../../Fetchers/SyncTableRest';
import { handleFieldDependencies } from '../../utils/helpers';
import { cleanQueryParams } from '../../helpers-rest';
import { draftOrderFieldDependencies } from '../../schemas/syncTable/DraftOrderSchema';
import { DraftOrderRestFetcher } from './DraftOrderRestFetcher';
import { DraftOrder, draftOrderResource } from './draftOrder';
import { Sync_DraftOrders } from './draftOrders-coda';

export class DraftOrderSyncTable extends SyncTableRest<DraftOrder> {
  constructor(fetcher: DraftOrderRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(draftOrderResource, fetcher, params);
  }

  // static dynamicOptions: coda.DynamicOptions = {
  //   getSchema: async function (context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
  //     let { schema, metafieldOwnerType } = draftOrderResource;
  //     let augmentedSchema = deepCopy(schema);
  //     if (formulaContext.syncMetafields) {
  //       augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, metafieldOwnerType, context);
  //     }

  //     const shopCurrencyCode = await new ShopRestFetcher(context).getActiveCurrency();

  //     // Line items
  //     [augmentedSchema.properties.line_items.items.properties].forEach((properties) => {
  //       properties.price['currencyCode'] = shopCurrencyCode;
  //       properties.total_discount['currencyCode'] = shopCurrencyCode;
  //       properties.discount_allocations.items.properties.amount['currencyCode'] = shopCurrencyCode;
  //     });

  //     // Tax lines
  //     [
  //       augmentedSchema.properties.line_items.items.properties.tax_lines.items.properties,
  //       augmentedSchema.properties.tax_lines.items.properties,
  //       augmentedSchema.properties.line_items.items.properties.duties.items.properties.tax_lines.items.properties,
  //     ].forEach((properties) => {
  //       properties.price['currencyCode'] = shopCurrencyCode;
  //     });

  //     // Main props
  //     augmentedSchema.properties.subtotal_price['currencyCode'] = shopCurrencyCode;
  //     augmentedSchema.properties.total_price['currencyCode'] = shopCurrencyCode;
  //     augmentedSchema.properties.total_tax['currencyCode'] = shopCurrencyCode;

  //     // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
  //     augmentedSchema.featuredProperties.push('admin_url');
  //   },
  //   defaultAddDynamicColumns: false,
  //   propertyOptions: async function (context) {
  //     if (context.propertyName === 'template_suffix') {
  //       return getTemplateSuffixesFor('article', context);
  //     }
  //   },
  // };

  setSyncParams() {
    const [syncMetafields, status, updated_at, ids, since_id] = this.codaParams as SyncTableParamValues<
      typeof Sync_DraftOrders
    >;

    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, draftOrderFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
      ids: ids && ids.length ? ids.join(',') : undefined,
      status,
      since_id,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
    });
  }
}
// export class DraftOrderSyncTable extends SyncTableRest<DraftOrder.SyncTable> {
//   constructor(fetcher: DraftOrderRestFetcher, params: coda.ParamValues<coda.ParamDefs>) {
//     super(draftOrderResource, fetcher, params);
//   }

//   static dynamicOptions: coda.DynamicOptions = {
//     getSchema: async function (context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
//       let { schema, metafieldOwnerType } = draftOrderResource;
//       let augmentedSchema = deepCopy(schema);
//       if (formulaContext.syncMetafields) {
//         augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, metafieldOwnerType, context);
//       }

//       const shopCurrencyCode = await new ShopRestFetcher(context).getActiveCurrency();

//       // Line items
//       [augmentedSchema.properties.line_items.items.properties].forEach((properties) => {
//         properties.price['currencyCode'] = shopCurrencyCode;
//         properties.total_discount['currencyCode'] = shopCurrencyCode;
//         properties.discount_allocations.items.properties.amount['currencyCode'] = shopCurrencyCode;
//       });

//       // Tax lines
//       [
//         augmentedSchema.properties.line_items.items.properties.tax_lines.items.properties,
//         augmentedSchema.properties.tax_lines.items.properties,
//         augmentedSchema.properties.line_items.items.properties.duties.items.properties.tax_lines.items.properties,
//       ].forEach((properties) => {
//         properties.price['currencyCode'] = shopCurrencyCode;
//       });

//       // Main props
//       augmentedSchema.properties.subtotal_price['currencyCode'] = shopCurrencyCode;
//       augmentedSchema.properties.total_price['currencyCode'] = shopCurrencyCode;
//       augmentedSchema.properties.total_tax['currencyCode'] = shopCurrencyCode;

//       // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
//       augmentedSchema.featuredProperties.push('admin_url');
//     },
//     defaultAddDynamicColumns: false,
//     propertyOptions: async function (context) {
//       if (context.propertyName === 'template_suffix') {
//         return getTemplateSuffixesFor('article', context);
//       }
//     },
//   };

//   setSyncParams() {
//     const [syncMetafields, status, updated_at, ids, since_id] = this.codaParams as SyncTableParamValues<
//       typeof Sync_DraftOrders
//     >;

//     const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, draftOrderFieldDependencies);
//     this.syncParams = cleanQueryParams({
//       fields: syncedStandardFields.join(', '),
//       limit: this.restLimit,
//       ids: ids && ids.length ? ids.join(',') : undefined,
//       status,
//       since_id,
//       updated_at_min: updated_at ? updated_at[0] : undefined,
//       updated_at_max: updated_at ? updated_at[1] : undefined,
//     });
//   }
// }
