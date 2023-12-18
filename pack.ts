/// <reference path="./node_modules/gas-coda-export-bills/Interfaces.d.ts"/>

import * as coda from '@codahq/packs-sdk';

import { setupArticles } from './articles/articles-setup';
import { setupBlogs } from './blogs/blogs-setup';
import { setupCollections } from './collections/collections-setup';
import { setupCustomers } from './customers/customers-setup';
import { setupMetafields } from './metafields/metafields-setup';
import { setupMetaObjects } from './metaobjects/metaobjects-setup';
import { setupOrders } from './orders/orders-setup';
import { setupProducts } from './products/products-setup';
import { setupProductVariants } from './productVariants/productVariants-setup';
import { setupShop } from './shop/shop-setup';
import { setupTranslations } from './translations/translations-setup';

import { fetchShopDetails } from './shop/shop-functions';

export const pack = coda.newPack();

/**====================================================================================================================
 *    Auth
 *===================================================================================================================== */
pack.setUserAuthentication({
  type: coda.AuthenticationType.Custom,
  requiresEndpointUrl: true,
  endpointDomain: 'myshopify.com',
  params: [
    {
      name: 'token',
      description: 'The account token',
    },
  ],
  // Determines the display name of the connected account.
  getConnectionName: async (context) => {
    const shop = await fetchShopDetails(['myshopify_domain'], context);
    if (shop && shop['myshopify_domain']) return shop['myshopify_domain'];
  },
});
pack.addNetworkDomain('myshopify.com');

setupArticles(pack);
setupBlogs(pack);
setupCollections(pack);
setupCustomers(pack);
setupMetafields(pack);
setupMetaObjects(pack);
setupOrders(pack);
setupProducts(pack);
setupProductVariants(pack);
setupShop(pack);
setupTranslations(pack);
