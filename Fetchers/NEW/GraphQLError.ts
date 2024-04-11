// #region Types
export type ShopifyGraphQlThrottleStatus = {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
};

export type ShopifyGraphQlRequestCost = {
  requestedQueryCost: number;
  actualQueryCost: number | null;
  throttleStatus: ShopifyGraphQlThrottleStatus;
};

// export type ShopifyGraphQlError = {
//   locations: {
//     line: number;
//     column: number;
//   }[];
//   message: string;
//   path?: string[];
//   extensions?: {
//     code: string;
//     typeName: string;
//     fieldName: string;
//     cost?: number;
//     maxCost?: number;
//     documentation?: string;
//   };
// };

interface ShopifyGraphQlGenericError {
  message: string;
  locations: Array<{
    line: number;
    column: number;
  }>;
  path: Array<string | number>;
}

export interface ShopifyGraphQlThrottledError {
  message: string;
  extensions: {
    code: 'THROTTLED';
    documentation: string;
  };
}
export interface ShopifyGraphQlMaxCostExceededError {
  message: string;
  extensions: {
    code: 'MAX_COST_EXCEEDED';
    cost: number;
    maxCost: number;
    documentation: string;
  };
}

export type ShopifyGraphQlError =
  | ShopifyGraphQlGenericError
  | ShopifyGraphQlThrottledError
  | ShopifyGraphQlMaxCostExceededError;

/** Represents an error in the input of a mutation. */
export type ShopifyGraphQlUserError = {
  __typename?: 'UserError';
  /** The path to the input field that caused the error. */
  field: string[];
  code?: string;
  /** The error message. */
  message: string;
};
// #endregion

abstract class GraphQLError extends Error {}

abstract class GraphQLRetryableErrors extends GraphQLError {
  originalError: ShopifyGraphQlError;

  constructor(message: string, originalError: ShopifyGraphQlError) {
    super(message);
    this.originalError = originalError;
  }
}

export class GraphQLThrottledError extends GraphQLRetryableErrors {
  cost: ShopifyGraphQlRequestCost;
  constructor(originalError: ShopifyGraphQlThrottledError, cost: ShopifyGraphQlRequestCost) {
    super(originalError.message, originalError);
    this.name = 'ShopifyThrottledError';
    this.cost = cost;
  }
}

export class GraphQLMaxCostExceededError extends GraphQLRetryableErrors {
  cost: number;
  maxCost: number;
  constructor(originalError: ShopifyGraphQlMaxCostExceededError) {
    super(originalError.message, originalError);
    this.name = 'ShopifyMaxExceededError';
    this.cost = originalError.extensions.cost;
    this.maxCost = originalError.extensions.maxCost;
  }
}
