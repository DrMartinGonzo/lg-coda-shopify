// TODO: trouver un moyen d'importer les types Shopify Rest depuis la bonne version de l'API de façon dynamique, en suivant la valeur de 'REST_DEFAULT_API_VERSION'

/// <reference path="./node_modules/gas-coda-export-bills/Interfaces.d.ts"/>
// #region Imports
import * as coda from '@codahq/packs-sdk';

import { IS_ADMIN_RELEASE } from './pack-config.json';
import { ShopRestFetcher } from './shop/shop-functions';

import { Formula_ProductStatus, Formula_ProductType } from './helpers-setup';
import {
  Formula_MetaBoolean,
  Formula_MetaCollectionReference,
  Formula_MetaColor,
  Formula_MetaDateTime,
  Formula_MetaDate,
  // Formula_MetafieldKeyValueSet,
  Formula_MetaMetaobjectReference,
  Formula_MetaMixedReference,
  Formula_MetaPageReference,
  Formula_MetaProductReference,
  Formula_MetaSingleLineText,
  Formula_MetaVariantReference,
  Formula_MetaWeight,
  Formula_MetaNumberInteger,
  Formula_MetaNumberDecimal,
  Formula_FormatListMetafield,
  Formula_FormatMetafield,
  Formula_MetafieldKey,
  Formula_MetaUrl,
  Formula_MetaVolume,
  Formula_MetaMoney,
  Formula_MetaJson,
  Formula_MetaMultiLineText,
  Formula_MetaDimension,
  Formula_MetaRating,
} from './metafields/metafields-setup';
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
import {
  Action_CompleteDraftOrder,
  Action_DeleteDraftOrder,
  Action_SendDraftOrderInvoice,
  Action_UpdateDraftOrder,
  Formula_DraftOrder,
  Sync_DraftOrders,
} from './draftOrders/draftOrders-setup';
import { Action_DeleteFile, Format_File, Formula_File, Sync_Files } from './files/files-setup';
import { Action_UpdateInventoryItem, Sync_InventoryItems } from './inventoryItems/inventoryItems-setup';
import {
  Action_AdjustInventoryLevel,
  Action_SetInventoryLevel,
  Sync_InventoryLevels,
} from './inventoryLevels/inventoryLevels-setup';
import {
  Action_ActivateLocation,
  Action_DeactivateLocation,
  Action_UpdateLocation,
  Format_Location,
  Formula_Location,
  Sync_Locations,
} from './locations/locations-setup';
import {
  Action_DeleteMetafield,
  Action_SALUT,
  Action_SetMetafield,
  Formula_Metafield,
  Formula_Metafields,
  Sync_Metafields,
} from './metafields/metafields-setup';
import {
  Format_MetafieldDefinition,
  Formula_MetafieldDefinition,
  Sync_MetafieldDefinitions,
} from './metafieldDefinitions/metafieldDefinitions-setup';
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
import {
  Action_CreatePage,
  Action_DeletePage,
  Action_UpdatePage,
  Format_Page,
  Formula_Page,
  Sync_Pages,
} from './pages/pages-setup';
import {
  Action_CreateProductVariant,
  Action_DeleteProductVariant,
  Action_UpdateProductVariant,
  Format_ProductVariant,
  Formula_ProductVariant,
  Sync_ProductVariants,
} from './productVariants/productVariants-setup';
import {
  Action_CreateProduct,
  Action_DeleteProduct,
  Action_UpdateProduct,
  Format_Product,
  Formula_Product,
  Sync_Products,
} from './products/products-setup';
import {
  Action_CreateRedirect,
  Action_DeleteRedirect,
  Action_UpdateRedirect,
  Format_Redirect,
  Formula_Redirect,
  Sync_Redirects,
} from './redirects/redirects-setup';
import { Formula_Shop, Formula_ShopField, Sync_Shops } from './shop/shop-setup';
import { setupTranslations } from './translations/translations-setup';

// #endregion

export const pack = coda.newPack();

// #region Auth
pack.setUserAuthentication({
  type: coda.AuthenticationType.Custom,
  requiresEndpointUrl: true,
  endpointDomain: 'myshopify.com',
  instructionsUrl: 'https://help.shopify.com/en/manual/apps/app-types/custom-apps#create-and-install-a-custom-app',
  params: [{ name: 'token', description: 'The account token' }],
  // Determines the display name of the connected account.
  getConnectionName: async (context) => {
    const shopFetcher = new ShopRestFetcher(context);
    const response = await shopFetcher.fetch();
    if (response?.body?.shop?.myshopify_domain) {
      return response.body.shop.myshopify_domain;
    }
  },
});
pack.addNetworkDomain('myshopify.com');
// #endregion

// #region Sync Tables
pack.syncTables.push(Sync_Articles);
pack.syncTables.push(Sync_Blogs);
pack.syncTables.push(Sync_Collects);
pack.syncTables.push(Sync_Collections);
pack.syncTables.push(Sync_Customers);
pack.syncTables.push(Sync_DraftOrders);
pack.syncTables.push(Sync_InventoryItems);
pack.syncTables.push(Sync_InventoryLevels);
pack.syncTables.push(Sync_Files);
pack.syncTables.push(Sync_Locations);
pack.syncTables.push(Sync_Metafields);
pack.syncTables.push(Sync_MetafieldDefinitions);
pack.syncTables.push(Sync_Metaobjects);
pack.syncTables.push(Sync_OrderLineItems);
pack.syncTables.push(Sync_Orders);
pack.syncTables.push(Sync_OrderTransactions);
pack.syncTables.push(Sync_Pages);
pack.syncTables.push(Sync_Products);
pack.syncTables.push(Sync_ProductVariants);
pack.syncTables.push(Sync_Redirects);
pack.syncTables.push(Sync_Shops);
// #endregion

// #region Formulas
pack.formulas.push(Formula_Article);
pack.formulas.push(Formula_Blog);
pack.formulas.push(Formula_Collection);
pack.formulas.push(Formula_Customer);
pack.formulas.push(Formula_DraftOrder);
pack.formulas.push(Formula_File);
pack.formulas.push(Formula_Location);
pack.formulas.push(Formula_Metafield);
pack.formulas.push(Formula_MetafieldDefinition);
pack.formulas.push(Formula_Order);
if (IS_ADMIN_RELEASE) {
  pack.formulas.push(Formula_Metafields);
  pack.formulas.push(Formula_Orders);
  pack.formulas.push(Formula_OrderExportFormat);
}
pack.formulas.push(Formula_Page);
pack.formulas.push(Formula_Product);
pack.formulas.push(Formula_ProductVariant);
pack.formulas.push(Formula_Redirect);
pack.formulas.push(Formula_Shop);
if (IS_ADMIN_RELEASE) {
  pack.formulas.push(Formula_ShopField);
}
// #endregion

// #region Actions
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

pack.formulas.push(Action_CompleteDraftOrder);
pack.formulas.push(Action_SendDraftOrderInvoice);
pack.formulas.push(Action_UpdateDraftOrder);
pack.formulas.push(Action_DeleteDraftOrder);

pack.formulas.push(Action_DeleteFile);

pack.formulas.push(Action_UpdateInventoryItem);

pack.formulas.push(Action_SetInventoryLevel);
pack.formulas.push(Action_AdjustInventoryLevel);

pack.formulas.push(Action_UpdateLocation);
pack.formulas.push(Action_ActivateLocation);
pack.formulas.push(Action_DeactivateLocation);

pack.formulas.push(Action_SetMetafield);
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

if (IS_ADMIN_RELEASE) {
  pack.formulas.push(Action_SALUT);
}
// #endregion

// #region Column Formats
pack.formats.push(Format_Article);
pack.formats.push(Format_Blog);
pack.formats.push(Format_Collection);
pack.formats.push(Format_Customer);
pack.formats.push(Format_File);
pack.formats.push(Format_Location);
pack.formats.push(Format_MetafieldDefinition);
pack.formats.push(Format_Order);
pack.formats.push(Format_Page);
pack.formats.push(Format_Product);
pack.formats.push(Format_ProductVariant);
pack.formats.push(Format_Redirect);
// #endregion

setupTranslations(pack);

// #region Helper formulas
// Metafields Helpers
pack.formulas.push(Formula_FormatMetafield);
pack.formulas.push(Formula_FormatListMetafield);
pack.formulas.push(Formula_MetafieldKey);

pack.formulas.push(Formula_MetaBoolean);
pack.formulas.push(Formula_MetaCollectionReference);
pack.formulas.push(Formula_MetaColor);
pack.formulas.push(Formula_MetaDateTime);
pack.formulas.push(Formula_MetaDate);
pack.formulas.push(Formula_MetaDimension);
pack.formulas.push(Formula_MetaJson);
pack.formulas.push(Formula_MetaMoney);
pack.formulas.push(Formula_MetaMultiLineText);
pack.formulas.push(Formula_MetaNumberDecimal);
pack.formulas.push(Formula_MetaNumberInteger);
pack.formulas.push(Formula_MetaUrl);
pack.formulas.push(Formula_MetaVolume);
pack.formulas.push(Formula_MetaRating);

pack.formulas.push(Formula_MetaMetaobjectReference);
pack.formulas.push(Formula_MetaMixedReference);
pack.formulas.push(Formula_MetaPageReference);
pack.formulas.push(Formula_MetaProductReference);
pack.formulas.push(Formula_MetaSingleLineText);
pack.formulas.push(Formula_MetaVariantReference);
pack.formulas.push(Formula_MetaWeight);

// Misc Helpers
pack.formulas.push(Formula_ProductStatus);
pack.formulas.push(Formula_ProductType);
// #endregion
