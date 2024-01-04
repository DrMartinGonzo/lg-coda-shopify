import * as coda from '@codahq/packs-sdk';

import {
  createResourceMetafield,
  deleteResourceMetafield,
  fetchMetafield,
  fetchResourceMetafields,
  updateResourceMetafield,
} from './metafields-functions';

import { MetafieldSchema } from './metafields-schema';
import { makeGraphQlRequest } from '../helpers-graphql';

import { METAFIELDS_RESOURCE_TYPES } from '../constants';

export const setupMetafields = (pack) => {
  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  // Fetch Single Metafields
  pack.addFormula({
    name: 'Metafield',
    description: 'Get a single metafield by its id.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
    ],
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Object,
    schema: MetafieldSchema,
    execute: fetchMetafield,
  });

  // Fetch Resource Metafields
  pack.addFormula({
    name: 'Metafields',
    description: 'Get metafields from a specific resource.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'resourceId',
        description: 'The id of the resource.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'resourceType',
        description: 'The type of resource.',
        autocomplete: METAFIELDS_RESOURCE_TYPES,
      }),
    ],
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Array,
    items: MetafieldSchema,
    execute: fetchResourceMetafields,
  });

  /**====================================================================================================================
   *    Actions
   *===================================================================================================================== */
  // Create single Resource Metafield
  pack.addFormula({
    name: 'CreateMetafield',
    description: 'create resource metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'resourceId',
        description: 'The id of the resource.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'resourceType',
        description: 'The type of resource.',
        autocomplete: METAFIELDS_RESOURCE_TYPES,
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
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'type',
        description: 'The value type of the metafield.',
        optional: true,
      }),
    ],
    isAction: true,
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Number,
    execute: async ([resourceId, resourceType, namespace, key, value, type], context) => {
      const response = await createResourceMetafield([resourceId, resourceType, namespace, key, value, type], context);
      const { body } = response;
      return body.metafield.id;
    },
  });

  // Update single Resource Metafield
  pack.addFormula({
    name: 'UpdateMetafield',
    description: 'update resource metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: 'resourceId',
        description: 'The id of the resource.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'resourceType',
        description: 'The type of resource.',
        autocomplete: METAFIELDS_RESOURCE_TYPES,
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'The value of the metafield.',
      }),
    ],
    isAction: true,
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Boolean,
    execute: async ([metafieldId, resourceId, resourceType, value], context) => {
      const response = await updateResourceMetafield([metafieldId, resourceId, resourceType, value], context);
      return true;
    },
  });

  // Delete single Resource Metafield
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
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Boolean,
    execute: async ([metafieldId], context) => {
      const response = await deleteResourceMetafield([metafieldId], context);
      return true;
    },
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'Metafield',
    instructions: 'Retrieve a single metafield',
    formulaName: 'Metafield',
  });
};
