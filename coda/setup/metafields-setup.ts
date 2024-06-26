// #region Imports
import * as coda from '@codahq/packs-sdk';
import toPascalCase from 'to-pascal-case';

import { FetchRequestOptions } from '../../Clients/Client.types';
import { ListMetafieldsArgs, MetafieldClient as MetafieldGraphQlClient } from '../../Clients/GraphQlClients';
import { MetafieldClient } from '../../Clients/RestClients';
import { RequiredParameterMissingVisibleError } from '../../Errors/Errors';
import { CACHE_DEFAULT, CACHE_DISABLED } from '../../constants/cacheDurations-constants';
import { METAFIELD_TYPES, MetafieldType } from '../../constants/metafields-constants';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlFileTypes, GraphQlFileTypesNames, GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { MetafieldGraphQlModel, SupportedMetafieldOwnerType } from '../../models/graphql/MetafieldGraphQlModel';
import { AbstractModelRest } from '../../models/rest/AbstractModelRest';
import { AbstractModelRestWithRestMetafields } from '../../models/rest/AbstractModelRestWithMetafields';
import { MetafieldModel } from '../../models/rest/MetafieldModel';
import {
  metafieldReferenceTypeToGraphQlOwnerName,
  ownerTypeToGraphQlOwnerName,
  ownerTypeToRestOwnerName,
} from '../../models/utils/metafields-utils';
import {
  ownerTypeToRestClient,
  ownerTypeToRestClientMap,
  ownerTypeToRestModel,
} from '../../models/utils/restModelWithRestMetafields-utils';
import { MetafieldSyncTableSchema } from '../../schemas/syncTable/MetafieldSchema';
import { SupportedMetafieldSyncTable } from '../../sync/SupportedMetafieldSyncTable';
import { SyncedGraphQlMetafields } from '../../sync/graphql/SyncedGraphQlMetafields';
import { SyncedMetafields } from '../../sync/rest/SyncedMetafields';
import { CurrencyCode, MetafieldOwnerType } from '../../types/admin.types';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { CodaMetafieldValue } from '../CodaMetafieldValue';
import { filters, getMetafieldOwnerTypesAutocompleteOptions, inputs } from '../utils/coda-parameters';
import { makeDeleteRestResourceAction } from '../utils/coda-utils';

// #endregion

// #region Helper functions
function createSyncedRestMetafields(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext,
  ownerModel: typeof AbstractModelRest | ReturnType<typeof ownerTypeToRestModel>,
  ownerClient: typeof MetafieldClient | ReturnType<typeof ownerTypeToRestClient>
) {
  return new SyncedMetafields<AbstractModelRestWithRestMetafields>({
    context,
    codaSyncParams,
    // @ts-expect-error
    model: ownerModel,
    // @ts-expect-error
    client: ownerClient.createInstance(context),
  });
}
function createSyncedGraphQlMetafields(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext
) {
  return new SyncedGraphQlMetafields({
    context,
    codaSyncParams,
    model: MetafieldGraphQlModel,
    client: MetafieldGraphQlClient.createInstance(context),
  });
}

function validateQueryParams({ ownerId, isShopQuery }: { ownerId?: number; isShopQuery?: boolean }) {
  if (isShopQuery === false && ownerId === undefined) {
    throw new RequiredParameterMissingVisibleError(
      `ownerID is required when requesting metafields from resources other than Shop.`
    );
  }
}

function makeMetafieldReferenceValueFormulaDefinition(type: MetafieldType) {
  return coda.makeFormula({
    name: `Meta${toPascalCase(type)}`,
    description: `Helper function to build a \`${type}\` metafield value.`,
    parameters: [{ ...inputs.metafield.referenceId, description: `The ID of the referenced ${type.split('_')[0]}.` }],
    resultType: coda.ValueType.String,
    connectionRequirement: coda.ConnectionRequirement.None,
    execute: async ([value]) =>
      new CodaMetafieldValue({
        type,
        value: idToGraphQlGid(metafieldReferenceTypeToGraphQlOwnerName(type), value),
      }).toJSON(),
    examples: [
      {
        params: [123456789],
        result: new CodaMetafieldValue({
          type,
          value: idToGraphQlGid(metafieldReferenceTypeToGraphQlOwnerName(type), 123456789),
        }).toJSON(),
      },
    ],
  });
}

function isRestSync(metafieldOwnerType: SupportedMetafieldOwnerType) {
  return Object.keys(ownerTypeToRestClientMap).includes(metafieldOwnerType);
}
// #endregion

// #region Sync tables
export const Sync_Metafields = coda.makeDynamicSyncTable({
  name: 'Metafields',
  description: 'Return Metafields from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Metafield,
  listDynamicUrls: async (context) =>
    getMetafieldOwnerTypesAutocompleteOptions().map((r) => ({ ...r, hasChildren: false })),
  getName: async function (context) {
    const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
    const supportedSyncTable = new SupportedMetafieldSyncTable(metafieldOwnerType);
    return `${supportedSyncTable.display} Metafields`;
  },
  /* Direct access to the metafield definition settings page for the resource */
  getDisplayUrl: async function (context) {
    const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
    const supportedSyncTable = new SupportedMetafieldSyncTable(metafieldOwnerType);
    return supportedSyncTable.getAdminUrl(context);
  },
  getSchema: async (context, _, formulaContext) => SyncedMetafields.getDynamicSchema({ context, codaSyncParams: [] }),
  defaultAddDynamicColumns: false,
  formula: {
    name: 'SyncMetafields',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link SyncedMetafields.codaParamsMap}
     */
    parameters: [{ ...filters.metafield.metafieldKeys, optional: true }],
    execute: async function (codaSyncParams, context) {
      const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
      if (isRestSync(metafieldOwnerType)) {
        const restModel = ownerTypeToRestModel(metafieldOwnerType);
        const restClient = ownerTypeToRestClient(metafieldOwnerType);
        return createSyncedRestMetafields(codaSyncParams, context, restModel, restClient).executeSync();
      } else {
        return createSyncedGraphQlMetafields(codaSyncParams, context).executeSync();
      }
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (codaSyncParams, updates, context) {
      const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
      if (isRestSync(metafieldOwnerType)) {
        /** Must add the owner type to the rows */
        updates.forEach((update) => {
          update.previousValue.owner_type = metafieldOwnerType;
          update.newValue.owner_type = metafieldOwnerType;
        });

        return createSyncedRestMetafields(codaSyncParams, context, MetafieldModel, MetafieldClient).executeSyncUpdate(
          updates
        );
      } else {
        return createSyncedGraphQlMetafields(codaSyncParams, context).executeSyncUpdate(updates);
      }
    },
  },
});
// #endregion

// #region Actions
export const Action_SetMetafield = coda.makeFormula({
  name: 'SetMetafield',
  description:
    'Set a metafield. If the metafield does not exist, it will be created. If it exists and you input an empty value, it will be deleted. Return the metafield data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.metafield.ownerType,
    inputs.general.metafieldValue,
    {
      ...inputs.metafield.ownerID,
      description: inputs.metafield.ownerID.description + ' Not needed if setting a Shop metafield.',
      optional: true,
    },
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  schema: MetafieldSyncTableSchema,
  execute: async ([ownerType, metafieldParam, owner_id], context) => {
    const metafield = CodaMetafieldSet.createRestMetafield(metafieldParam, {
      context,
      ownerId: owner_id,
      ownerResource: ownerTypeToRestOwnerName(ownerType as SupportedMetafieldOwnerType),
    });
    await metafield.save();
    return metafield.toCodaRow();
  },
});

/**
 * Alternative version of SetMetafield Action. Main benefit is having autocomplete
 * on key, but we have to manually specify if the metafield is a `list`.
 */
// export const Action_SetMetafieldAltVersion = coda.makeFormula({
//   name: 'SetMetafieldAltVersion',
//   description:
//     'Set a metafield. If the metafield does not exist, it will be created. If it exists and you input an empty value, it will be deleted. Return the metafield data.',
//   connectionRequirement: coda.ConnectionRequirement.Required,
//   parameters: [
//     inputs.metafield.ownerType,
//     inputs.metafield.fullKeyAutocomplete,
//     coda.makeParameter({
//       type: coda.ParameterType.StringArray,
//       name: 'value',
//       description:
//         'A single metafield value or a list of metafield values inside a List() formula. Use one of the `Meta{…}` helper formulas for values. You have to check the `isListMetafield` parameter if the metafield is a list.',
//       suggestedValue: [],
//     }),
//     {
//       ...inputs.metafield.ownerID,
//       description: inputs.metafield.ownerID.description + ' Not needed if setting a Shop metafield.',
//       // empty string to force Coda to show the field
//       suggestedValue: '',
//       optional: true,
//     },
//     coda.makeParameter({
//       type: coda.ParameterType.Boolean,
//       name: 'isListMetafield',
//       description: 'Wether the metafield is a `list` metafield. For example `list.color`, `list.number_decimal`, etc…',
//       suggestedValue: false,
//       optional: true,
//     }),
//   ],
//   isAction: true,
//   resultType: coda.ValueType.Object,
//   schema: MetafieldSyncTableSchema,
//   execute: async ([ownerType, fullKey, values, ownerId, list = false], context) => {
//     const ownerResource = matchOwnerTypeToOwnerResource(ownerType as SupportedMetafieldOwnerType);
//     let isList = !!list;

//     const codaMetafieldSet = isList
//       ? CodaMetafieldSet.createFromFormatListMetafieldFormula({ fullKey, varargs: values })
//       : CodaMetafieldSet.createFromFormatMetafieldFormula({
//           fullKey,
//           value: Array.isArray(values) ? values[0] : values,
//         });

//     const isShopQuery = ownerType === MetafieldOwnerType.Shop;
//     if (!isShopQuery && ownerId === undefined) {
//       throw new RequiredParameterMissingVisibleError(
//         `ownerID is required when setting metafields from resources other than Shop.`
//       );
//     }

//     const metafieldInstance = codaMetafieldSet.toMetafield({
//       context,
//       owner_id: isShopQuery ? undefined : ownerId,
//       owner_resource: ownerResource,
//     });

//     await metafieldInstance.saveAndUpdate();
//     return metafieldInstance.formatToRow(false);
//   },
// });

export const Action_DeleteMetafield = makeDeleteRestResourceAction({
  modelName: MetafieldModel.displayName,
  IdParameter: inputs.metafield.id,
  execute: async ([itemId], context) => {
    await MetafieldClient.createInstance(context).delete({ id: itemId as number });
    return true;
  },
});
// #endregion

// #region Formulas
export const Formula_Metafield = coda.makeFormula({
  name: 'Metafield',
  description: 'Get a single metafield by its fullkey.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.metafield.ownerType,
    inputs.metafield.fullKeyAutocomplete,
    {
      ...inputs.metafield.ownerID,
      description: inputs.metafield.ownerID.description + ' Not needed if requesting Shop metafields.',
      optional: true,
    },
  ],
  cacheTtlSecs: CACHE_DEFAULT,
  resultType: coda.ValueType.Object,
  schema: MetafieldSyncTableSchema,
  execute: async function ([ownerType, fullKey, ownerId], context) {
    const isShopQuery = ownerType === MetafieldOwnerType.Shop;
    validateQueryParams({ ownerId, isShopQuery });
    const metafieldOwnerType = ownerType as SupportedMetafieldOwnerType;

    if (isRestSync(metafieldOwnerType)) {
      const response = await MetafieldClient.createInstance(context).listByKeys({
        metafieldKeys: [fullKey],
        owner_id: isShopQuery ? undefined : ownerId,
        owner_resource: ownerTypeToRestOwnerName(metafieldOwnerType),
      });
      if (response.body) {
        return MetafieldModel.createInstance(context, response.body[0]).toCodaRow();
      }
    } else {
      const graphQlResourceName = ownerTypeToGraphQlOwnerName(metafieldOwnerType);
      const response = await MetafieldGraphQlClient.createInstance(context).listBySingleOwnerId({
        metafieldKeys: [fullKey],
        ownerGid: idToGraphQlGid(graphQlResourceName, ownerId),
      });
      if (response.body) {
        return MetafieldGraphQlModel.createInstance(context, response.body[0]).toCodaRow();
      }
    }
  },
});

export const Formula_MetafieldsLoop = coda.makeFormula({
  name: 'MetafieldsLoop',
  isExperimental: true,
  description: 'Get all metafields from a specific resource.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.metafield.ownerType,
    {
      ...inputs.metafield.ownerID,
      description: inputs.metafield.ownerID.description + ' Not needed if requesting Shop metafields.',
      optional: true,
    },
  ],
  cacheTtlSecs: CACHE_DISABLED, // Cache is disabled intentionally
  resultType: coda.ValueType.Array,
  items: MetafieldSyncTableSchema,
  execute: async function ([ownerType, ownerId], context) {
    const isShopQuery = ownerType === MetafieldOwnerType.Shop;
    validateQueryParams({ ownerId, isShopQuery });

    const metafieldOwnerType = ownerType as SupportedMetafieldOwnerType;
    const fetchRequestOptions: FetchRequestOptions = { cacheTtlSecs: CACHE_DISABLED };

    // —————— Using Rest
    if (isRestSync(metafieldOwnerType)) {
      const response = await MetafieldClient.createInstance(context).list({
        owner_id: ownerId,
        owner_resource: ownerTypeToRestOwnerName(metafieldOwnerType),
        options: fetchRequestOptions,
      });
      return response.body.map((m) => MetafieldModel.createInstance(context, m).toCodaRow());
    }
    // —————— Using GraphQL
    else {
      const listArgs: ListMetafieldsArgs = { options: fetchRequestOptions };
      if (isShopQuery) {
        listArgs.ownerType = ownerType as SupportedMetafieldOwnerType;
      } else {
        const graphQlOwnerName = ownerTypeToGraphQlOwnerName(ownerType as SupportedMetafieldOwnerType);
        listArgs.ownerIds = [idToGraphQlGid(graphQlOwnerName, ownerId)];
      }

      const response = await MetafieldGraphQlClient.createInstance(context).list(listArgs);
      return response.body.map((m) => MetafieldGraphQlModel.createInstance(context, m).toCodaRow());
    }
  },
});
// #endregion

// #region Helper Formulas
export const Formula_MetafieldKey = coda.makeFormula({
  name: 'MetafieldKey',
  description: 'Helper function to find an existing metafield key that has a definition.',
  parameters: [inputs.metafield.ownerType, inputs.metafield.fullKeyAutocomplete],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.Required,
  execute: async ([graphQlOwnerType, fullKey]) => {
    return fullKey;
  },
});

export const Formula_FormatMetafield = coda.makeFormula({
  name: 'FormatMetafield',
  description: 'Helper function to format value for a non `list` metafield.',
  parameters: [inputs.metafield.fullKey, inputs.metafield.value],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([fullKey, value]) => CodaMetafieldSet.createFromFormatMetafieldFormula({ fullKey, value }).toJSON(),
  examples: [
    {
      params: ['custom.boolean', 'MetaBoolean(true)'],
      result: JSON.stringify({
        key: 'custom.boolean',
        type: METAFIELD_TYPES.boolean,
        value: true,
      }),
    },
    {
      params: ['mp_custom.skey', 'MetaSingleLineText(`hello !`)'],
      result: JSON.stringify({
        key: 'mp_custom.skey',
        type: METAFIELD_TYPES.single_line_text_field,
        value: 'hello !',
      }),
    },
  ],
});

export const Formula_FormatListMetafield = coda.makeFormula({
  name: 'FormatListMetafield',
  description: 'Helper function to format values for a `list` metafield.',
  parameters: [inputs.metafield.fullKey],
  varargParameters: [inputs.metafield.value],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([fullKey, ...varargs]) =>
    CodaMetafieldSet.createFromFormatListMetafieldFormula({ fullKey, varargs }).toJSON(),
  examples: [
    {
      params: ['custom.colorList', 'MetaColor(`#cccccc`)', 'MetaColor(`#ff00cc`)'],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.list_color,
        value: ['#cccccc', '#cccccc'],
      }).toJSON(),
    },
  ],
});

export const Formula_MetaBoolean = coda.makeFormula({
  name: 'MetaBoolean',
  description: 'Helper function to build a `boolean` metafield value.',
  parameters: [{ ...inputs.metafield.boolean, description: 'True or false ?' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.boolean, value }).toJSON(),
  examples: [
    {
      params: [false],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.boolean,
        value: false,
      }).toJSON(),
    },
  ],
});

export const Formula_MetaColor = coda.makeFormula({
  name: 'MetaColor',
  description: 'Helper function to build a `color` metafield value.',
  parameters: [
    {
      ...inputs.metafield.string,
      description: 'The color value. Supports RGB values in #RRGGBB format.',
    },
  ],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.color, value }).toJSON(),
  examples: [
    {
      params: ['#cccccc'],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.color,
        value: '#cccccc',
      }).toJSON(),
    },
  ],
});

export const Formula_MetaDate = coda.makeFormula({
  name: 'MetaDate',
  description: 'Helper function to build a `date` metafield value.',
  parameters: [{ ...inputs.metafield.date, description: 'The date value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.date, value }).toJSON(),
  examples: [
    {
      params: [`Date(2024, 6, 10)`],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.date,
        value: '2024-06-09T22:00:00.000Z',
      }).toJSON(),
    },
  ],
});

export const Formula_MetaDateTime = coda.makeFormula({
  name: 'MetaDateTime',
  description: 'Helper function to build a `date_time` metafield value.',
  parameters: [{ ...inputs.metafield.date, description: 'The date_time value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.date_time, value }).toJSON(),
  examples: [
    {
      params: [`DateTime(2024, 6, 10,15,12,32)`],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.date_time,
        value: '2024-06-10T13:12:32.000Z',
      }).toJSON(),
    },
  ],
});

export const Formula_MetaDimension = coda.makeFormula({
  name: 'MetaDimension',
  description: 'Helper function to build a `dimension` metafield value.',
  parameters: [
    { ...inputs.metafield.number, description: 'The dimension value.' },
    inputs.metafield.dimensionUnitGraphQl,
  ],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value, unit]) =>
    new CodaMetafieldValue({ type: METAFIELD_TYPES.dimension, value: { value, unit } }).toJSON(),
  examples: [
    {
      params: [100, 'MILLIMETERS'],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.dimension,
        value: {
          value: 100,
          unit: 'MILLIMETERS',
        },
      }).toJSON(),
    },
  ],
});

export const Formula_MetaFileReference = coda.makeFormula({
  name: `MetaFileReference`,
  description: `Helper function to build a \`file_reference\` metafield value.`,
  parameters: [
    {
      ...inputs.metafield.referenceId,
      description: `The ID of the referenced file.`,
    },
    filters.file.fileType,
  ],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value, fileType]) => {
    if (!GraphQlFileTypesNames.includes(fileType as GraphQlFileTypes)) {
      throw new Error(`Unknown file type: ${fileType}`);
    }
    return new CodaMetafieldValue({
      type: METAFIELD_TYPES.file_reference,
      value: idToGraphQlGid(fileType as GraphQlFileTypes, value),
    }).toJSON();
  },
  examples: [
    {
      params: [34028708233472, GraphQlResourceNames.MediaImage],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.file_reference,
        value: idToGraphQlGid(GraphQlResourceNames.MediaImage, 34028708233472),
      }).toJSON(),
    },
  ],
});

export const Formula_MetaJson = coda.makeFormula({
  name: 'MetaJson',
  description: 'Helper function to build a `json` metafield value.',
  parameters: [{ ...inputs.metafield.string, description: 'The JSON content.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.json, value }).toJSON(),
  examples: [
    {
      params: ['{"compilerOptions": {"skipLibCheck": true}}'],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.json,
        value: '{"compilerOptions": {"skipLibCheck": true}}',
      }).toJSON(),
    },
  ],
});

export const Formula_MetaMetaobjectReference = makeMetafieldReferenceValueFormulaDefinition(
  METAFIELD_TYPES.metaobject_reference
);

export const Formula_MetaMixedReference = makeMetafieldReferenceValueFormulaDefinition(METAFIELD_TYPES.mixed_reference);

export const Formula_MetaMoney = coda.makeFormula({
  name: 'MetaMoney',
  description: 'Helper function to build a `money` metafield value.',
  parameters: [{ ...inputs.metafield.number, description: 'The amount.' }, inputs.metafield.currencyCode],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([amount, currency_code]: [number, CurrencyCode], context) =>
    new CodaMetafieldValue({ type: METAFIELD_TYPES.money, value: { amount, currency_code } }).toJSON(),
  examples: [
    {
      params: [50, 'EUR'],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.money,
        value: { amount: 50, currency_code: 'EUR' },
      }).toJSON(),
    },
  ],
});

export const Formula_MetaMultiLineText = coda.makeFormula({
  name: 'MetaMultiLineText',
  description: 'Helper function to build a `multi_line_text_field` metafield value.',
  parameters: [{ ...inputs.metafield.string, description: 'The text content.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.multi_line_text_field, value }).toJSON(),
  examples: [
    {
      params: ['multiple\nlines\nof\ntext'],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.multi_line_text_field,
        value: 'multiple\nlines\nof\ntext',
      }).toJSON(),
    },
  ],
});

export const Formula_MetaNumberDecimal = coda.makeFormula({
  name: 'MetaNumberDecimal',
  description: 'Helper function to build a `number_decimal` metafield value.',
  parameters: [{ ...inputs.metafield.number, description: 'The decimal number value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.number_decimal, value }).toJSON(),
  examples: [
    {
      params: [1.25],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.number_decimal,
        value: 1.25,
      }).toJSON(),
    },
  ],
});

export const Formula_MetaNumberInteger = coda.makeFormula({
  name: 'MetaNumberInteger',
  description: 'Helper function to build a `number_integer` metafield value.',
  parameters: [{ ...inputs.metafield.number, description: 'The integer value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.number_integer, value }).toJSON(),
  examples: [
    {
      params: [6],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.number_integer,
        value: 6,
      }).toJSON(),
    },
  ],
});

export const Formula_MetaPageReference = makeMetafieldReferenceValueFormulaDefinition(METAFIELD_TYPES.page_reference);

export const Formula_MetaProductReference = makeMetafieldReferenceValueFormulaDefinition(
  METAFIELD_TYPES.product_reference
);

export const Formula_MetaRating = coda.makeFormula({
  name: 'MetaRating',
  description: 'Helper function to build a `dimension` metafield value.',
  parameters: [
    { ...inputs.metafield.number, description: 'The rating value.' },
    inputs.metafield.scaleMin,
    inputs.metafield.scaleMax,
  ],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value, scale_min, scale_max]) =>
    new CodaMetafieldValue({
      type: METAFIELD_TYPES.rating,
      value: {
        value,
        scale_min,
        scale_max,
      },
    }).toJSON(),
  examples: [
    {
      params: [6, 1, 10],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.rating,
        value: { value: 6, scale_min: 1, scale_max: 10 },
      }).toJSON(),
    },
  ],
});

export const Formula_MetaSingleLineText = coda.makeFormula({
  name: 'MetaSingleLineText',
  description: 'Helper function to build a `single_line_text_field` metafield value.',
  parameters: [{ ...inputs.metafield.string, description: 'The text content.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.single_line_text_field, value }).toJSON(),
  examples: [
    {
      params: ['hello !'],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.single_line_text_field,
        value: 'hello !',
      }).toJSON(),
    },
  ],
});

export const Formula_MetaUrl = coda.makeFormula({
  name: 'MetaUrl',
  description: 'Helper function to build a `url` metafield value.',
  parameters: [{ ...inputs.metafield.string, description: 'The url.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.url, value }).toJSON(),
  examples: [
    {
      params: ['https://coda.io'],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.url,
        value: 'https://coda.io',
      }).toJSON(),
    },
  ],
});

export const Formula_MetaVariantReference = makeMetafieldReferenceValueFormulaDefinition(
  METAFIELD_TYPES.variant_reference
);

export const Formula_MetaVolume = coda.makeFormula({
  name: 'MetaVolume',
  description: 'Helper function to build a `weight` metafield value.',
  parameters: [{ ...inputs.metafield.number, description: 'The volume value.' }, inputs.metafield.volumeUnitGraphQl],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value, unit]) =>
    new CodaMetafieldValue({ type: METAFIELD_TYPES.volume, value: { value, unit } }).toJSON(),
  examples: [
    {
      params: [100, 'LITERS'],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.volume,
        value: {
          value: 100,
          unit: 'LITERS',
        },
      }).toJSON(),
    },
  ],
});

export const Formula_MetaWeight = coda.makeFormula({
  name: 'MetaWeight',
  description: 'Helper function to build a `weight` metafield value.',
  parameters: [{ ...inputs.metafield.number, description: 'The weight value.' }, inputs.metafield.weightUnitGraphQl],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value, unit]) =>
    new CodaMetafieldValue({ type: METAFIELD_TYPES.weight, value: { value, unit } }).toJSON(),
  examples: [
    {
      params: [100, 'KILOGRAMS'],
      result: new CodaMetafieldValue({
        type: METAFIELD_TYPES.weight,
        value: {
          value: 100,
          unit: 'KILOGRAMS',
        },
      }).toJSON(),
    },
  ],
});

export const Formula_MetaCollectionReference = makeMetafieldReferenceValueFormulaDefinition(
  METAFIELD_TYPES.collection_reference
);
// #endregion
