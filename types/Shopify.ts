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

export type ShopifyMetafieldDefinition = {
  key: string;
  id: string;
  namespace: string;
  name: string;
  description: string;
  ownerType: string;
  type: {
    category: string;
    name: string;
    supportedValidations: {
      name: string;
      type: string;
    }[];
  };
  validations: {
    name: string;
    type: string;
    value: string;
  }[];
};

export type ShopifyMetaobjectFieldDefinition = {
  key: string;
  description: string;
  name: string;
  required: boolean;
  type: {
    category: string;
    name: string;
    supportedValidations: {
      name: string;
      type: string;
    }[];
    supportsDefinitionMigrations: boolean;
  };
  validations: {
    name: string;
    type: string;
    value: string;
  };
};
