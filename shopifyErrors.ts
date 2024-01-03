import { ShopifyGraphQlRequestCost } from './types/Shopify';

export type ShopifyGraphQlError = {
  locations: {
    line: number;
    column: number;
  }[];
  message: string;
  path?: string[];
  extensions?: {
    code: string;
    typeName: string;
    fieldName: string;
    cost?: number;
    maxCost?: number;
    documentation?: string;
  };
};

export type ShopifyGraphQlUserError = {
  field: string[];
  code?: string;
  message: string;
};

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
