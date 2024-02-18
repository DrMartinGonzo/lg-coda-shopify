/// <reference path="./node_modules/gas-coda-export-bills/Interfaces.d.ts"/>
// #region Imports
import * as coda from '@codahq/packs-sdk';

import {
  Action_CreateArticle,
  Action_DeleteArticle,
  Action_UpdateArticle,
  Format_Article,
  Formula_Article,
  Sync_Articles,
} from './articles/articles-setup';
import {
  Action_CreateBlog,
  Action_DeleteBlog,
  Action_UpdateBlog,
  Format_Blog,
  Formula_Blog,
  Sync_Blogs,
} from './blogs/blogs-setup';
import {
  Action_CreateCollection,
  Action_DeleteCollection,
  Action_UpdateCollection,
  Format_Collection,
  Formula_Collection,
  Sync_Collections,
  Sync_Collects,
} from './collections/collections-setup';
import {
  Action_CreateCustomer,
  Action_DeleteCustomer,
  Action_UpdateCustomer,
  Format_Customer,
  Formula_Customer,
  Sync_Customers,
} from './customers/customers-setup';
import { Sync_Files } from './files/files-setup';
import {
  Action_AdjustInventoryLevel,
  Action_SetInventoryLevel,
  Sync_InventoryLevels,
} from './inventoryLevels/inventoryLevels-setup';
import {
  Action_CreateMetafield,
  Action_DeleteMetafield,
  Action_SALUT,
  Action_UpdateMetafield,
  Formula_Metafield,
  Formula_Metafields,
  Sync_Metafields,
} from './metafields/metafields-setup';
import {
  Action_CreateMetaObject,
  Action_DeleteMetaObject,
  Action_UpdateMetaObject,
  Sync_Metaobjects,
} from './metaobjects/metaobjects-setup';
import {
  Format_Order,
  Formula_Order,
  Formula_OrderExportFormat,
  Formula_Orders,
  Sync_Orders,
} from './orders/orders-setup';
import { Sync_OrderLineItems } from './orderLineItems/orderLineItems-setup';
import { Sync_OrderTransactions } from './orderTransactions/orderTransactions-setup';
import { Action_CreatePage, Action_DeletePage, Action_UpdatePage, Sync_Pages } from './pages/pages-setup';
import {
  Action_CreateProductVariant,
  Action_DeleteProductVariant,
  Action_UpdateProductVariant,
  Format_ProductVariant,
  Formula_ProductVariant,
  Sync_ProductVariants,
} from './productVariants/productVariants-setup';
import { Formula_ShopField } from './shop/shop-setup';
import { setupTranslations } from './translations/translations-setup';
import {
  Action_ActivateLocation,
  Action_DeactivateLocation,
  Action_UpdateLocation,
  Format_Location,
  Formula_Location,
  Sync_Locations,
} from './locations/locations-setup';
import {
  Action_CreateRedirect,
  Action_DeleteRedirect,
  Action_UpdateRedirect,
  Format_Redirect,
  Formula_Redirect,
  Sync_Redirects,
} from './redirects/redirects-setup';
import { fetchShopDetails } from './shop/shop-functions';
import {
  Action_CreateProduct,
  Action_DeleteProduct,
  Action_UpdateProduct,
  Format_Product,
  Formula_Product,
  Sync_Products,
} from './products/products-setup';
import {
  Formula_MetafieldBooleanValue,
  Formula_MetafieldCollectionReferenceValue,
  Formula_MetafieldColorValue,
  Formula_MetafieldDateTimeValue,
  Formula_MetafieldDateValue,
  Formula_MetafieldKeyValueSet,
  Formula_MetafieldMetaobjectReferenceValue,
  Formula_MetafieldMixedReferenceValue,
  Formula_MetafieldPageReferenceValue,
  Formula_MetafieldProductReferenceValue,
  Formula_MetafieldSingleLineTextValue,
  Formula_MetafieldVariantReferenceValue,
  Formula_MetafieldWeightValue,
  Formula_ProductStatus,
  Formula_ProductType,
  Formula_MetafieldValues,
} from './helpers-setup';
import { Action_UpdateInventoryItem, Sync_InventoryItems } from './inventoryItems/inventoryItems-setup';
import { IS_ADMIN_RELEASE } from './constants';

// #endregion

export const pack = coda.newPack();

/**====================================================================================================================
 *    Auth
 *===================================================================================================================== */
pack.setUserAuthentication({
  type: coda.AuthenticationType.Custom,
  requiresEndpointUrl: true,
  endpointDomain: 'myshopify.com',
  params: [{ name: 'token', description: 'The account token' }],
  // Determines the display name of the connected account.
  getConnectionName: async (context) => {
    const shop = await fetchShopDetails(['myshopify_domain'], context);
    if (shop && shop['myshopify_domain']) return shop['myshopify_domain'];
  },
});
pack.addNetworkDomain('myshopify.com');

// Sync Tables
pack.syncTables.push(Sync_Articles);
pack.syncTables.push(Sync_Blogs);
pack.syncTables.push(Sync_Collects);
pack.syncTables.push(Sync_Collections);
pack.syncTables.push(Sync_Customers);
pack.syncTables.push(Sync_InventoryItems);
pack.syncTables.push(Sync_InventoryLevels);
pack.syncTables.push(Sync_Files);
pack.syncTables.push(Sync_Locations);
pack.syncTables.push(Sync_Metafields);
pack.syncTables.push(Sync_Metaobjects);
pack.syncTables.push(Sync_OrderLineItems);
pack.syncTables.push(Sync_Orders);
pack.syncTables.push(Sync_OrderTransactions);
pack.syncTables.push(Sync_Pages);
pack.syncTables.push(Sync_Products);
pack.syncTables.push(Sync_ProductVariants);
pack.syncTables.push(Sync_Redirects);

// Formulas
pack.formulas.push(Formula_Article);
pack.formulas.push(Formula_Blog);
pack.formulas.push(Formula_Collection);
pack.formulas.push(Formula_Customer);
pack.formulas.push(Formula_Location);
pack.formulas.push(Formula_Metafield);
pack.formulas.push(Formula_Metafields);
pack.formulas.push(Formula_Order);
if (IS_ADMIN_RELEASE) {
  pack.formulas.push(Formula_Orders);
  pack.formulas.push(Formula_OrderExportFormat);
}
pack.formulas.push(Formula_Product);
pack.formulas.push(Formula_ProductVariant);
pack.formulas.push(Formula_Redirect);
pack.formulas.push(Formula_ShopField);

// Actions
pack.formulas.push(Action_CreateArticle);
pack.formulas.push(Action_UpdateArticle);
pack.formulas.push(Action_DeleteArticle);

pack.formulas.push(Action_CreateBlog);
pack.formulas.push(Action_UpdateBlog);
pack.formulas.push(Action_DeleteBlog);

pack.formulas.push(Action_CreateCollection);
pack.formulas.push(Action_UpdateCollection);
pack.formulas.push(Action_DeleteCollection);

pack.formulas.push(Action_CreateCustomer);
pack.formulas.push(Action_UpdateCustomer);
pack.formulas.push(Action_DeleteCustomer);

pack.formulas.push(Action_UpdateInventoryItem);

pack.formulas.push(Action_SetInventoryLevel);
pack.formulas.push(Action_AdjustInventoryLevel);

pack.formulas.push(Action_UpdateLocation);
pack.formulas.push(Action_ActivateLocation);
pack.formulas.push(Action_DeactivateLocation);

pack.formulas.push(Action_CreateMetafield);
pack.formulas.push(Action_UpdateMetafield);
pack.formulas.push(Action_DeleteMetafield);

pack.formulas.push(Action_CreateMetaObject);
pack.formulas.push(Action_UpdateMetaObject);
pack.formulas.push(Action_DeleteMetaObject);

pack.formulas.push(Action_CreatePage);
pack.formulas.push(Action_UpdatePage);
pack.formulas.push(Action_DeletePage);

pack.formulas.push(Action_CreateProduct);
pack.formulas.push(Action_UpdateProduct);
pack.formulas.push(Action_DeleteProduct);

pack.formulas.push(Action_CreateProductVariant);
pack.formulas.push(Action_UpdateProductVariant);
pack.formulas.push(Action_DeleteProductVariant);

pack.formulas.push(Action_CreateRedirect);
pack.formulas.push(Action_UpdateRedirect);
pack.formulas.push(Action_DeleteRedirect);

pack.formulas.push(Action_SALUT);

// Column Formats
pack.formats.push(Format_Article);
pack.formats.push(Format_Blog);
pack.formats.push(Format_Collection);
pack.formats.push(Format_Customer);
pack.formats.push(Format_Location);
pack.formats.push(Format_Order);
pack.formats.push(Format_Product);
pack.formats.push(Format_ProductVariant);
pack.formats.push(Format_Redirect);

setupTranslations(pack);

// #region Helper formulas
// Metafields Helpers
pack.formulas.push(Formula_MetafieldKeyValueSet);
pack.formulas.push(Formula_MetafieldValues);

pack.formulas.push(Formula_MetafieldBooleanValue);
pack.formulas.push(Formula_MetafieldCollectionReferenceValue);
pack.formulas.push(Formula_MetafieldColorValue);
pack.formulas.push(Formula_MetafieldDateTimeValue);
pack.formulas.push(Formula_MetafieldDateValue);
pack.formulas.push(Formula_MetafieldMetaobjectReferenceValue);
pack.formulas.push(Formula_MetafieldMixedReferenceValue);
pack.formulas.push(Formula_MetafieldPageReferenceValue);
pack.formulas.push(Formula_MetafieldProductReferenceValue);
pack.formulas.push(Formula_MetafieldSingleLineTextValue);
pack.formulas.push(Formula_MetafieldVariantReferenceValue);
pack.formulas.push(Formula_MetafieldWeightValue);

// Misc Helpers
pack.formulas.push(Formula_ProductStatus);
pack.formulas.push(Formula_ProductType);
// #endregion
