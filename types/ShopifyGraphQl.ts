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
