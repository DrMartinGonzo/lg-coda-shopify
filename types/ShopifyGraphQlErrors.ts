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

export type ShopifyGraphQlRequestExtensions = {
  extensions: {
    cost: ShopifyGraphQlRequestCost;
  };
};
