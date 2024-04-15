// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CACHE_DEFAULT, CACHE_MAX, OPTIONS_PRODUCT_STATUS_REST } from '../../constants';
import { getUnitMap } from '../../utils/helpers';

import { filters, inputs } from '../coda-parameters';

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
      autocomplete: Object.keys(getUnitMap('weight')),
      suggestedValue: 'GRAMS',
    }),
  ],
  cacheTtlSecs: CACHE_MAX,
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([unit]) => {
    const unitMap = getUnitMap('weight');
    if (!unitMap.hasOwnProperty(unit)) {
      throw new coda.UserVisibleError('Unsupported unit: ' + unit);
    }
    return unitMap[unit];
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
    if (!OPTIONS_PRODUCT_STATUS_REST.map((option) => option.value).includes(status)) {
      throw new coda.UserVisibleError('Unsupported status: ' + status);
    }
    return status;
  },
});
// #endregion
