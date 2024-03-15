import { ShopifyGraphQlError, ShopifyGraphQlRequestCost } from './types/Fetcher';

export class ShopifyRetryableErrors extends Error {
  originalError: ShopifyGraphQlError;

  constructor(message: string, error: ShopifyGraphQlError) {
    super(message);
    this.originalError = error;
  }
}

export class ShopifyThrottledError extends ShopifyRetryableErrors {
  cost: ShopifyGraphQlRequestCost;
  constructor(message: string, error: ShopifyGraphQlError, cost: ShopifyGraphQlRequestCost) {
    super(message, error);
    this.name = 'ShopifyThrottledError';
    this.cost = cost;
  }
}

export class ShopifyMaxExceededError extends ShopifyRetryableErrors {
  constructor(message: string, error: ShopifyGraphQlError) {
    super(message, error);
    this.name = 'ShopifyMaxExceededError';
  }
}
