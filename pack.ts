import * as coda from '@codahq/packs-sdk';

import { setupCollections } from './collections/collections-setup';
import { setupCustomers } from './customers/customers-setup';
import { setupMetafields } from './metafields/metafields-setup';
import { setupOrders } from './orders/orders-setup';
import { setupProductVariants } from './productVariants/productVariants-setup';
import { setupProducts } from './products/products-setup';

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
  getConnectionName: async (context) => new URL(context.endpoint).hostname,
});
pack.addNetworkDomain('myshopify.com');

setupCollections(pack);
setupCustomers(pack);
setupMetafields(pack);
setupOrders(pack);
setupProducts(pack);
setupProductVariants(pack);
