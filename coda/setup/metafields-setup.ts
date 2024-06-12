// #region Imports
import * as coda from '@codahq/packs-sdk';
import toPascalCase from 'to-pascal-case';

import { ListMetafieldsArgs, MetafieldClient as MetafieldGraphQlClient } from '../../Clients/GraphQlApiClientBase';
import { ArticleClient, BlogClient, MetafieldClient, PageClient } from '../../Clients/RestApiClientBase';
import { RequiredParameterMissingVisibleError, UnsupportedValueError } from '../../Errors/Errors';
import { MetafieldGraphQl } from '../../Resources/GraphQl/MetafieldGraphQl';
import { SupportedMetafieldOwnerType } from '../../models/graphql/MetafieldGraphQlModel';
import { METAFIELD_TYPES, MetafieldType } from '../../Resources/Mixed/METAFIELD_TYPES';
import { MetafieldHelper } from '../../Resources/Mixed/MetafieldHelper';
import { SupportedMetafieldSyncTable } from '../../Resources/Mixed/SupportedMetafieldSyncTable';
import {
  GraphQlFileTypes,
  GraphQlFileTypesNames,
  GraphQlResourceName,
  GraphQlResourceNames,
} from '../../Resources/types/SupportedResource';
import { CACHE_DEFAULT, CACHE_DISABLED, PACK_IDENTITIES } from '../../constants';
import { MetafieldGraphQlModel } from '../../models/graphql/MetafieldGraphQlModel';
import { AbstractModelRestWithRestMetafields } from '../../models/rest/AbstractModelRestWithMetafields';
import { ArticleModel } from '../../models/rest/ArticleModel';
import { BlogModel } from '../../models/rest/BlogModel';
import { MetafieldModel } from '../../models/rest/MetafieldModel';
import { PageModel } from '../../models/rest/PageModel';
import { MetafieldSyncTableSchema } from '../../schemas/syncTable/MetafieldSchema';
import { SyncedGraphQlMetafields } from '../../sync/graphql/SyncedGraphQlMetafields';
import { SyncedMetafields } from '../../sync/rest/SyncedMetafields';
import { CurrencyCode, MetafieldOwnerType } from '../../types/admin.types';
import { makeDeleteRestResourceAction } from '../../utils/coda-utils';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { matchOwnerTypeToOwnerResource, matchOwnerTypeToResourceName } from '../../utils/metafields-utils';
import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { CodaMetafieldSetNew } from '../CodaMetafieldSetNew';
import { CodaMetafieldValue } from '../CodaMetafieldValue';
import { filters, inputs } from '../coda-parameters';

// #endregion

// #region Helper functions
function createSyncedRestMetafields(
  codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  context: coda.SyncExecutionContext,
  ownerModel: typeof ArticleModel | typeof BlogModel | typeof PageModel,
  ownerClient: typeof ArticleClient | typeof BlogClient | typeof PageClient
) {
  return new SyncedMetafields<AbstractModelRestWithRestMetafields<any>>({
    context,
    codaSyncParams,
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
    execute: async ([value]) => {
      let resource: GraphQlResourceName;
      switch (type) {
        case METAFIELD_TYPES.collection_reference:
          resource = GraphQlResourceNames.Collection;
          break;
        case METAFIELD_TYPES.metaobject_reference:
        case METAFIELD_TYPES.mixed_reference:
          resource = GraphQlResourceNames.Metaobject;
          break;
        case METAFIELD_TYPES.page_reference:
          resource = GraphQlResourceNames.Page;
          break;
        case METAFIELD_TYPES.product_reference:
          resource = GraphQlResourceNames.Product;
          break;
        case METAFIELD_TYPES.variant_reference:
          resource = GraphQlResourceNames.ProductVariant;
          break;

        default:
          throw new UnsupportedValueError('MetafieldTypeValue', type);
      }

      return new CodaMetafieldValue({
        type: METAFIELD_TYPES[type],
        value: idToGraphQlGid(resource, value),
      }).toJSON();
    },
  });
}
// #endregion

// #region Sync tables
export const Sync_Metafields = coda.makeDynamicSyncTable({
  name: 'Metafields',
  description: 'Return Metafields from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: PACK_IDENTITIES.Metafield,
  listDynamicUrls: async (context) =>
    MetafieldHelper.listSupportedSyncTables().map((r) => ({ ...r, hasChildren: false })),
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
      const supportedSyncTable = new SupportedMetafieldSyncTable(metafieldOwnerType);

      // TODO: Article, Page and Blog should use GraphQL metafields once GraphQl API version 2024-07 is stable
      if (supportedSyncTable.syncWith === 'rest') {
        let ownerClient: typeof ArticleClient | typeof BlogClient | typeof PageClient;
        let ownerModel: typeof ArticleModel | typeof BlogModel | typeof PageModel;
        switch (metafieldOwnerType) {
          case MetafieldOwnerType.Article:
            ownerClient = ArticleClient;
            ownerModel = ArticleModel;
            break;
          case MetafieldOwnerType.Blog:
            ownerClient = BlogClient;
            ownerModel = BlogModel;
            break;
          case MetafieldOwnerType.Page:
            ownerClient = PageClient;
            ownerModel = PageModel;
            break;

          default:
            throw new UnsupportedValueError('MetafieldOwnerType', metafieldOwnerType);
        }

        return createSyncedRestMetafields(codaSyncParams, context, ownerModel, ownerClient).executeSync();
      } else {
        return createSyncedGraphQlMetafields(codaSyncParams, context).executeSync();
      }
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (codaSyncParams, updates, context) {
      const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
      const supportedSyncTable = new SupportedMetafieldSyncTable(metafieldOwnerType);

      if (supportedSyncTable.syncWith === 'rest') {
        /** Must add the owner type to the rows */
        updates.forEach((update) => {
          update.previousValue.owner_type = metafieldOwnerType;
          update.newValue.owner_type = metafieldOwnerType;
        });

        const syncedMetafields = new SyncedMetafields({
          context,
          codaSyncParams,
          // @ts-expect-error
          model: MetafieldModel,
          client: MetafieldClient.createInstance(context),
        });
        return syncedMetafields.executeSyncUpdate(updates);
      } else {
        return MetafieldGraphQl.syncUpdate(codaSyncParams, updates, context);
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
    const ownerResource = matchOwnerTypeToOwnerResource(ownerType as SupportedMetafieldOwnerType);
    const metafieldSet = CodaMetafieldSetNew.createFromCodaParameter(metafieldParam);
    const metafieldInstance = metafieldSet.toRestMetafield({
      context,
      owner_id,
      owner_resource: ownerResource,
    });
    await metafieldInstance.save();
    return metafieldInstance.toCodaRow();
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
    const supportedSyncTable = new SupportedMetafieldSyncTable(metafieldOwnerType);

    // TODO: Article, Page and Blog should use GraphQL metafields once GraphQl API version 2024-07 is stable
    if (supportedSyncTable.syncWith === 'rest') {
      const response = await MetafieldClient.createInstance(context).listByKeys({
        metafieldKeys: [fullKey],
        owner_id: isShopQuery ? undefined : ownerId,
        owner_resource: matchOwnerTypeToOwnerResource(metafieldOwnerType),
      });
      if (response.body) {
        return MetafieldModel.createInstance(context, response.body[0]).toCodaRow();
      }
    } else {
      const graphQlResourceName = matchOwnerTypeToResourceName(metafieldOwnerType);
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

export const Formula_Metafields = coda.makeFormula({
  name: 'Metafields',
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

    // —————— Using Rest
    // const response = await Metafield.all({
    //   owner_id,
    //   owner_resource: matchOwnerTypeToOwnerResource(ownerType as MetafieldOwnerType),
    //   context,
    //   options: { cacheTtlSecs: CACHE_DISABLED }, // Cache is disabled intentionally
    // });

    // —————— Using GraphQL
    // const baseParams = {
    //   context,
    //   options: { cacheTtlSecs: CACHE_DISABLED }, // Cache is disabled intentionally
    // };
    const listArgs: ListMetafieldsArgs = {
      options: { cacheTtlSecs: CACHE_DISABLED },
    };
    if (isShopQuery) {
      listArgs.ownerType = ownerType as SupportedMetafieldOwnerType;
    } else {
      listArgs.ownerIds = [idToGraphQlGid(matchOwnerTypeToResourceName(ownerType as MetafieldOwnerType), ownerId)];
    }

    const response = await MetafieldGraphQlClient.createInstance(context).list(listArgs);
    return response.body.map((m) => MetafieldGraphQlModel.createInstance(context, m).toCodaRow());

    // const response = isShopQuery
    //   ? await MetafieldGraphQl.all({
    //       ...baseParams,
    //       ownerType: ownerType as MetafieldOwnerType,
    //     })
    //   : await MetafieldGraphQl.all({
    //       ...baseParams,
    //       ownerIds: [idToGraphQlGid(matchOwnerTypeToResourceName(ownerType as MetafieldOwnerType), owner_id)],
    //     });

    // return response.data.map((m) => m.formatToRow(false));
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
});

export const Formula_FormatMetafieldNew = coda.makeFormula({
  name: 'FormatMetafieldNew',
  description: 'Helper function to format value for a non `list` metafield.',
  parameters: [inputs.metafield.ownerType, inputs.metafield.fullKeyAutocomplete, inputs.metafield.value],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.Required,
  execute: async ([ownerType, fullKey, value]) =>
    CodaMetafieldSet.createFromFormatMetafieldFormula({ fullKey, value }).toJSON(),
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
});

export const Formula_MetaBoolean = coda.makeFormula({
  name: 'MetaBoolean',
  description: 'Helper function to build a `boolean` metafield value.',
  parameters: [{ ...inputs.metafield.boolean, description: 'True or false ?' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.boolean, value }).toJSON(),
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
});

export const Formula_MetaDate = coda.makeFormula({
  name: 'MetaDate',
  description: 'Helper function to build a `date` metafield value.',
  parameters: [{ ...inputs.metafield.date, description: 'The date value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.date, value }).toJSON(),
});

export const Formula_MetaDateTime = coda.makeFormula({
  name: 'MetaDateTime',
  description: 'Helper function to build a `date_time` metafield value.',
  parameters: [{ ...inputs.metafield.date, description: 'The date_time value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.date_time, value }).toJSON(),
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
});

export const Formula_MetaJson = coda.makeFormula({
  name: 'MetaJson',
  description: 'Helper function to build a `json` metafield value.',
  parameters: [{ ...inputs.metafield.string, description: 'The JSON content.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.json, value }).toJSON(),
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
});

export const Formula_MetaMultiLineText = coda.makeFormula({
  name: 'MetaMultiLineText',
  description: 'Helper function to build a `multi_line_text_field` metafield value.',
  parameters: [{ ...inputs.metafield.string, description: 'The text content.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.multi_line_text_field, value }).toJSON(),
});

export const Formula_MetaNumberDecimal = coda.makeFormula({
  name: 'MetaNumberDecimal',
  description: 'Helper function to build a `number_decimal` metafield value.',
  parameters: [{ ...inputs.metafield.number, description: 'The decimal number value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.number_decimal, value }).toJSON(),
});

export const Formula_MetaNumberInteger = coda.makeFormula({
  name: 'MetaNumberInteger',
  description: 'Helper function to build a `number_integer` metafield value.',
  parameters: [{ ...inputs.metafield.number, description: 'The integer value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.number_integer, value }).toJSON(),
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
});

export const Formula_MetaSingleLineText = coda.makeFormula({
  name: 'MetaSingleLineText',
  description: 'Helper function to build a `single_line_text_field` metafield value.',
  parameters: [{ ...inputs.metafield.string, description: 'The text content.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.single_line_text_field, value }).toJSON(),
});

export const Formula_MetaUrl = coda.makeFormula({
  name: 'MetaUrl',
  description: 'Helper function to build a `url` metafield value.',
  parameters: [{ ...inputs.metafield.string, description: 'The url.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => new CodaMetafieldValue({ type: METAFIELD_TYPES.url, value }).toJSON(),
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
});

export const Formula_MetaWeight = coda.makeFormula({
  name: 'MetaWeight',
  description: 'Helper function to build a `weight` metafield value.',
  parameters: [{ ...inputs.metafield.number, description: 'The weight value.' }, inputs.metafield.weightUnitGraphQl],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value, unit]) =>
    new CodaMetafieldValue({ type: METAFIELD_TYPES.weight, value: { value, unit } }).toJSON(),
});

export const Formula_MetaCollectionReference = makeMetafieldReferenceValueFormulaDefinition(
  METAFIELD_TYPES.collection_reference
);
// #endregion
