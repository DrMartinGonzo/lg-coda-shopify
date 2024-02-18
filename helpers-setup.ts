import * as coda from '@codahq/packs-sdk';
import toPascalCase from 'to-pascal-case';

import {
  CACHE_SINGLE_FETCH,
  CACHE_YEAR,
  FIELD_TYPES,
  MetafieldTypeValue,
  OPTIONS_PRODUCT_STATUS_REST,
} from './constants';
import { arrayUnique, getUnitMap } from './helpers';
import { autocompleteProductTypes } from './products/products-functions';
import { GraphQlResource } from './types/GraphQl';
import { idToGraphQlGid } from './helpers-graphql';

// TODO: rename this
interface CodaMetafieldValue {
  type: MetafieldTypeValue;
  value: any;
}
interface CodaMetafieldListValue {
  type: MetafieldTypeValue;
  value: any[];
}
export interface CodaMetafieldKeyValueSet {
  key: string;
  value: CodaMetafieldValue | CodaMetafieldListValue | null;
  type?: MetafieldTypeValue;
}

const parameters = {
  metaBooleanValue: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'value',
    description: 'A boolean value.',
  }),
  metaNumberValue: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'value',
    description: 'A number value.',
  }),
  metaStringValue: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'text',
    description: 'A string value.',
  }),
  metaReferenceId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'id',
    description: 'The ID of the referenced resource.',
  }),
  metaDateValue: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'date',
    description: 'A date value.',
  }),
  dimensionUnit: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'unit',
    description: 'The weight unit supported by Shopify.',
    autocomplete: Object.keys(getUnitMap('weight')),
    // TODO: should be a constant
    suggestedValue: 'GRAMS',
  }),
};

function makeMetafieldReferenceValueFormulaDefinition(type: MetafieldTypeValue) {
  return coda.makeFormula({
    name: `Metafield${toPascalCase(type)}Value`,
    description: `Helper function to build a \`${type}\` metafield value.`,
    parameters: [{ ...parameters.metaReferenceId, description: `The ID of the referenced ${type.split('_')[0]}.` }],
    resultType: coda.ValueType.String,
    connectionRequirement: coda.ConnectionRequirement.None,
    execute: async ([value]) => {
      let resource: GraphQlResource;
      switch (type) {
        case FIELD_TYPES.collection_reference:
          resource = GraphQlResource.Collection;
          break;
        case FIELD_TYPES.metaobject_reference:
        case FIELD_TYPES.mixed_reference:
          resource = GraphQlResource.Metaobject;
          break;
        case FIELD_TYPES.page_reference:
          resource = GraphQlResource.Page;
          break;
        case FIELD_TYPES.product_reference:
          resource = GraphQlResource.Product;
          break;
        case FIELD_TYPES.variant_reference:
          resource = GraphQlResource.ProductVariant;
          break;

        default:
          break;
      }
      if (!resource) {
        throw new Error(`Unsupported type: ${type}`);
      }

      return JSON.stringify({
        type: FIELD_TYPES[type],
        value: idToGraphQlGid(resource, value),
      } as CodaMetafieldValue);
    },
  });
}

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
  cacheTtlSecs: CACHE_YEAR,
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
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'productType',
      description: 'The name of a product type. Autocomplete is available but you can enter any value.',
      autocomplete: autocompleteProductTypes,
    }),
  ],
  cacheTtlSecs: CACHE_SINGLE_FETCH,
  resultType: coda.ValueType.String,
  execute: async ([productType]) => {
    return productType;
  },
});

export const Formula_ProductStatus = coda.makeFormula({
  name: 'ProductStatus',
  description: 'Helper function to help choose a supported Shopify product status.',
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'productType',
      description: 'The status of the product.',
      autocomplete: OPTIONS_PRODUCT_STATUS_REST,
    }),
  ],
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

// #region Metafield Helpers
export const Formula_MetafieldKeyValueSet = coda.makeFormula({
  name: 'MetafieldKeyValueSet',
  description: 'Helper function to set a key/value metafield. Use this in a create or update resource action.',
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'fullKey',
      description:
        'The full key of the metafield. That is, the key prefixed with the namespace and separated by a dot. e.g. "namespace.key".',
    }),
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'value',
      description: 'A single metafield value or a list of metafield values wrapped with `MetafieldValues` formula.',
    }),
  ],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([fullKey, value]) => {
    if (!value || value === '') {
      return JSON.stringify({
        key: fullKey,
        value: null,
      });
    }
    const parsedValue: CodaMetafieldValue | CodaMetafieldListValue = JSON.parse(value);

    const obj: CodaMetafieldKeyValueSet = {
      key: fullKey,
      type: parsedValue.type,
      value: parsedValue.value,
    };
    return JSON.stringify(obj);
  },
});

export const Formula_MetafieldValues = coda.makeFormula({
  name: 'MetafieldValues',
  description:
    'Helper function to make a list of metafields out of multiple single values. The single values must all be of the same type and must be supported by Shopify.',
  parameters: [],
  varargParameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'value',
      description: 'The value of the item in the list. Use one of the `Metafield{…}Value` formulas.',
    }),
  ],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([...varargs]) => {
    const values: CodaMetafieldValue[] = varargs.map((v: string) => JSON.parse(v));
    const types = values.map((v) => v.type);
    const uniqueTypes = arrayUnique(types);
    if (uniqueTypes.length > 1) {
      throw new coda.UserVisibleError('All metafield values must be of the same type.');
    }

    const type: MetafieldTypeValue = uniqueTypes[0];
    const typeAsList = ('list.' + type) as MetafieldTypeValue;
    // check if typeAsList is supported by checking FIELD_TYPES
    if (!Object.values(FIELD_TYPES).includes(typeAsList)) {
      throw new coda.UserVisibleError(`Shopify doesn't support lists for metafields of type: \`${type}\`.`);
    }

    const obj: CodaMetafieldListValue = {
      type: typeAsList,
      value: values.map((v) => v.value),
    };

    return JSON.stringify(obj);
  },
});

export const Formula_MetafieldBooleanValue = coda.makeFormula({
  name: 'MetafieldBooleanValue',
  description: 'Helper function to build a `boolean` metafield value.',
  parameters: [{ ...parameters.metaBooleanValue, description: 'True or false ?' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => JSON.stringify({ type: FIELD_TYPES.boolean, value } as CodaMetafieldValue),
});

export const Formula_MetafieldColorValue = coda.makeFormula({
  name: 'MetafieldColorValue',
  description: 'Helper function to build a `color` metafield value.',
  parameters: [
    { ...parameters.metaStringValue, description: 'The color value. Supports RGB values in #RRGGBB format.' },
  ],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => JSON.stringify({ type: FIELD_TYPES.color, value } as CodaMetafieldValue),
});

export const Formula_MetafieldDateValue = coda.makeFormula({
  name: 'MetafieldDateValue',
  description: 'Helper function to build a `date` metafield value.',
  parameters: [{ ...parameters.metaDateValue, description: 'The date value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => JSON.stringify({ type: FIELD_TYPES.date, value } as CodaMetafieldValue),
});

export const Formula_MetafieldDateTimeValue = coda.makeFormula({
  name: 'MetafieldDateTimeValue',
  description: 'Helper function to build a `date_time` metafield value.',
  parameters: [{ ...parameters.metaDateValue, description: 'The date_time value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => JSON.stringify({ type: FIELD_TYPES.date_time, value } as CodaMetafieldValue),
});

export const Formula_MetafieldSingleLineTextValue = coda.makeFormula({
  name: 'MetafieldSingleLineTextValue',
  description: 'Helper function to build a `single_line_text_field` metafield value.',
  parameters: [{ ...parameters.metaStringValue, description: 'The text content.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => {
    return JSON.stringify({ type: FIELD_TYPES.single_line_text_field, value } as CodaMetafieldValue);
  },
});

export const Formula_MetafieldWeightValue = coda.makeFormula({
  name: 'MetafieldWeightValue',
  description: 'Helper function to build a `weight` metafield value.',
  parameters: [
    { ...parameters.metaNumberValue, description: 'The weight value.', suggestedValue: 0 },
    parameters.dimensionUnit,
  ],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value, unit]) => {
    const obj: CodaMetafieldValue = { type: FIELD_TYPES.weight, value: { value, unit } };
    return JSON.stringify(obj);
  },
});

export const Formula_MetafieldCollectionReferenceValue = makeMetafieldReferenceValueFormulaDefinition(
  FIELD_TYPES.collection_reference
);

// TODO: support all file types, we need a function MetafieldFileImageValue, MetafieldFileVideoValue etc ?
// export const Formula_MetafieldFileReferenceValue = makeMetafieldReferenceValueFormulaDefinition(
//   FIELD_TYPES.file_reference
// );

export const Formula_MetafieldMetaobjectReferenceValue = makeMetafieldReferenceValueFormulaDefinition(
  FIELD_TYPES.metaobject_reference
);

// TODO: need to test this
export const Formula_MetafieldMixedReferenceValue = makeMetafieldReferenceValueFormulaDefinition(
  FIELD_TYPES.mixed_reference
);

export const Formula_MetafieldPageReferenceValue = makeMetafieldReferenceValueFormulaDefinition(
  FIELD_TYPES.page_reference
);

export const Formula_MetafieldProductReferenceValue = makeMetafieldReferenceValueFormulaDefinition(
  FIELD_TYPES.product_reference
);

export const Formula_MetafieldVariantReferenceValue = makeMetafieldReferenceValueFormulaDefinition(
  FIELD_TYPES.variant_reference
);
// #endregion
