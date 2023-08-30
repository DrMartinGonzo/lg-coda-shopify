import * as coda from '@codahq/packs-sdk';

import { getTranslatableResource, translateResource } from './translations-functions';
import { TranslatableResourceSchema } from './translations-schema';

export const setupTranslations = (pack) => {
  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  // Fetch Translations for specific resource
  pack.addFormula({
    name: 'Translations',
    description: 'Get metafields from a specific resource.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'resourceId',
        description: 'The gid of the resource.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'locale',
        description: 'The locale to fetch translations for.',
      }),
    ],
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Object,
    schema: TranslatableResourceSchema,
    execute: getTranslatableResource,
  });

  /**====================================================================================================================
   *    Actions
   *===================================================================================================================== */
  // Translate a resource
  pack.addFormula({
    name: 'TranslateResource',
    description: 'Translate a ressource.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'resourceId',
        description: 'The id of the resource to translate.',
      }),
    ],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'locale',
        description: 'The key of the field.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The key of the field.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'the field value.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'digest',
        description: 'the field value.',
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.Boolean,
    execute: translateResource,
  });
};
