// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FetchRequestOptions } from '../../Clients/Client.types';
import { CACHE_DEFAULT } from '../../constants';
import { getProductTypesQuery } from '../../graphql/products-graphql';

/**
 * Check if a product is present in a collection
 */
/*
export const checkProductInCollection = async ([productGid, collectionGid], context: coda.ExecutionContext) => {
  const payload = {
    query: queryProductInCollection,
    variables: {
      collectionId: collectionGid,
      productId: productGid,
    },
  };

  const response = await graphQlRequest({ payload }, context);

  const { body } = response;
  return body.data.collection.hasProduct;
};
*/
