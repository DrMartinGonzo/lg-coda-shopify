// #region Imports
import * as coda from '@codahq/packs-sdk';

// #endregion

export function isCodaCached(response: coda.FetchResponse<any>): boolean {
  return (!!response.headers['Coda-Fetcher-Cache-Hit'] && response.headers['Coda-Fetcher-Cache-Hit'] === '1') ?? false;
}

const getShopifyAccessToken = (context: coda.ExecutionContext) => '{{token-' + context.invocationToken + '}}';
export const getShopifyRequestHeaders = (context: coda.ExecutionContext) => {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': getShopifyAccessToken(context),
  };
};

export const getShopifyStorefrontRequestHeaders = (context: coda.ExecutionContext) => {
  return {
    'Content-Type': 'application/json',
    'Shopify-Storefront-Private-Token': getShopifyAccessToken(context),
  };
};

/**
 * Delays the execution of subsequent code for a specified number of milliseconds.
 * Pack need to be executed/uploaded with --timerStrategy=fake flag for enable setTimeout shim
 *
 * @param {number} ms - The duration in milliseconds to wait
 */
export async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve('Rate limit wait'), ms);
  });
}
