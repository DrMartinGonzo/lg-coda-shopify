import * as coda from '@codahq/packs-sdk';

import {
  createProductMetafield,
  deleteMetafield,
  fetchMetafield,
  fetchProductMetafields,
  updateProductMetafield,
} from './metafields-functions';

import { ProductMetafieldSchema } from './metafields-schema';

export const setupMetafields = (pack) => {
  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  // A formula to fetch a product metafields.
  pack.addFormula({
    name: 'ProductMetafields',
    description: 'Get product metafields data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'productId',
        description: 'The id of the product.',
      }),
    ],
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Array,
    items: ProductMetafieldSchema,
    execute: fetchProductMetafields,
  });

  pack.addFormula({
    name: 'Metafield',
    description: 'Get a single  metafield by its id.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
    ],
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Object,
    schema: ProductMetafieldSchema,
    execute: fetchMetafield,
  });

  pack.addFormula({
    name: 'DeleteMetafield',
    description: 'delete metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async ([metafieldId], context) => {
      const response = await deleteMetafield([metafieldId], context);
      return true;
    },
  });

  pack.addFormula({
    name: 'UpdateProductMetafield',
    description: 'update product metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'productId',
        description: 'The id of the product.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'The value of the metafield.',
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: async ([productId, metafieldId, value], context) => {
      const response = await updateProductMetafield([productId, metafieldId, value], context);
      return true;
    },
  });

  pack.addFormula({
    name: 'CreateProductMetafield',
    description: 'create product metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'productId',
        description: 'The id of the product.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'namespace',
        description: 'The namespace of the metafield.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The key of the metafield.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'The value of the metafield.',
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.Number,
    execute: async ([productId, namespace, key, value], context) => {
      const response = await createProductMetafield([productId, namespace, key, value], context);
      const { body } = response;
      return body.metafield.id;
    },
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'ProductMetafields',
    instructions: 'Retrieve all product metafields',
    formulaName: 'ProductMetafields',
  });

  pack.addColumnFormat({
    name: 'Metafield',
    instructions: 'Retrieve a single metafield',
    formulaName: 'Metafield',
  });
};
