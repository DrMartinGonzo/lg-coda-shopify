// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CACHE_DEFAULT, CACHE_MAX } from '../../constants/cacheDurations-constants';
import { OPTIONS_PRODUCT_STATUS_GRAPHQL } from '../../constants/options-constants';
import { weightUnitsToLabelMap } from '../../models/utils/measurements-utils';

import { filters, inputs } from '../utils/coda-parameters';

// #endregion

// #region Misc Helpers
export const Formula_WeightUnit = coda.makeFormula({
  name: 'WeightUnit',
  description: 'Helper function to help choose a supported weight unit for a Shopify field.',
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'unit',
      description: 'Shopify supported weight unit type.',
      autocomplete: Object.keys(weightUnitsToLabelMap),
      suggestedValue: 'GRAMS',
    }),
  ],
  cacheTtlSecs: CACHE_MAX,
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([weightUnit]) => {
    if (weightUnit in weightUnitsToLabelMap) return weightUnitsToLabelMap[weightUnit];
    throw new coda.UserVisibleError('Unsupported unit: ' + weightUnit);
  },
});

export const Formula_ProductType = coda.makeFormula({
  name: 'ProductType',
  description: 'Helper function to help choose an existing Shopify product type.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    {
      ...filters.product.productType,
      description: 'The name of a product type. Autocomplete is available but you can enter any value.',
    },
  ],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.String,
  execute: async ([productType]) => {
    return productType;
  },
});

export const Formula_ProductStatus = coda.makeFormula({
  name: 'ProductStatus',
  description: 'Helper function to help choose a supported Shopify product status.',
  parameters: [inputs.product.status],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([status]) => {
    if (!OPTIONS_PRODUCT_STATUS_GRAPHQL.map((option) => option.value).includes(status)) {
      throw new coda.UserVisibleError('Unsupported status: ' + status);
    }
    return status;
  },
});
// #endregion
