// #region Imports
import * as coda from '@codahq/packs-sdk';
import toPascalCase from 'to-pascal-case';

import { CodaMetafieldSet } from '../CodaMetafieldSet';
import { CodaMetafieldValue } from '../CodaMetafieldValue';
import { NotFoundVisibleError, RequiredParameterMissingVisibleError, UnsupportedValueError } from '../../Errors/Errors';
import { AbstractSyncedRestResourceWithRestMetafields } from '../../Resources/Abstract/Rest/AbstractSyncedRestResourceWithRestMetafields';
import { Metafield } from '../../Resources/Rest/Metafield';
import { MetafieldGraphQl, SupportedMetafieldOwnerType } from '../../Resources/GraphQl/MetafieldGraphQl';
import { Shop } from '../../Resources/Rest/Shop';
import { Article } from '../../Resources/Rest/Article';
import { Blog } from '../../Resources/Rest/Blog';
import { Page } from '../../Resources/Rest/Page';
import { CACHE_DEFAULT, CACHE_DISABLED, Identity } from '../../constants';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { MetafieldSyncTableSchema } from '../../schemas/syncTable/MetafieldSchema';
import { filters, inputs } from '../coda-parameters';
import { CurrencyCode, MetafieldOwnerType } from '../../types/admin.types';
import { GraphQlResourceName } from '../../Resources/types/GraphQlResource.types';
import { METAFIELD_TYPES, MetafieldTypeValue } from '../../Resources/Mixed/Metafield.types';
import { matchOwnerTypeToOwnerResource, matchOwnerTypeToResourceName } from '../../utils/metafields-utils';

// #endregion

// #region Helpers
/**
 * Matches a GraphQl MetafieldOwnerType to the corresponding Rest owner Resource class.
 *
 * @param {MetafieldOwnerType} ownerType - the MetafieldOwnerType to match
 * @return {AbstractSyncedRestResourceWithRestMetafields} the corresponding Rest owner Resource class
 */

function matchOwnerTypeToOwnerResourceClass(
  ownerType: MetafieldOwnerType
): typeof AbstractSyncedRestResourceWithRestMetafields {
  switch (ownerType) {
    case MetafieldOwnerType.Article:
      return Article;
    case MetafieldOwnerType.Blog:
      return Blog;
    case MetafieldOwnerType.Page:
      return Page;
    case MetafieldOwnerType.Shop:
      return Shop;

    default:
      throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
  }
}

function makeMetafieldReferenceValueFormulaDefinition(type: MetafieldTypeValue) {
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
          resource = GraphQlResourceName.Collection;
          break;
        case METAFIELD_TYPES.metaobject_reference:
        case METAFIELD_TYPES.mixed_reference:
          resource = GraphQlResourceName.Metaobject;
          break;
        case METAFIELD_TYPES.page_reference:
          resource = GraphQlResourceName.OnlineStorePage;
          break;
        case METAFIELD_TYPES.product_reference:
          resource = GraphQlResourceName.Product;
          break;
        case METAFIELD_TYPES.variant_reference:
          resource = GraphQlResourceName.ProductVariant;
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
  identityName: Identity.Metafield,
  listDynamicUrls: async (context) => Metafield.listSupportedSyncTables().map((r) => ({ ...r, hasChildren: false })),
  getName: async function (context) {
    const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
    const { display } = Metafield.getOwnerInfo(metafieldOwnerType, context);
    return `${display} Metafields`;
  },
  /* Direct access to the metafield definition settings page for the resource */
  getDisplayUrl: async function (context) {
    const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
    const { adminDefinitionUrl: adminUrl } = Metafield.getOwnerInfo(metafieldOwnerType, context);
    return adminUrl;
  },
  getSchema: async function (context, _, formulaContext) {
    return Metafield.getDynamicSchema({ context, codaSyncParams: [] });
  },
  defaultAddDynamicColumns: false,
  formula: {
    name: 'SyncMetafields',
    description: '<Help text for the sync formula, not show to the user>',
    /**
     *! When changing parameters, don't forget to update :
     *  - {@link Metafield.getDynamicSchema}
     */
    parameters: [{ ...filters.metafield.metafieldKeys, optional: true }],
    execute: async function (params, context) {
      const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
      const { syncWith } = Metafield.getOwnerInfo(metafieldOwnerType, context);

      if (syncWith === 'rest') {
        // TODO: need helper function
        return Metafield.sync(params, context, matchOwnerTypeToOwnerResourceClass(metafieldOwnerType));
      } else {
        return MetafieldGraphQl.sync(params, context);
      }
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;

      const isRestUpdate = [
        MetafieldOwnerType.Article,
        MetafieldOwnerType.Blog,
        MetafieldOwnerType.Page,
        MetafieldOwnerType.Shop,
      ].includes(metafieldOwnerType);

      if (isRestUpdate) {
        return Metafield.syncUpdate(params, updates, context);
      } else {
        return MetafieldGraphQl.syncUpdate(params, updates, context);
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
  execute: async ([ownerType, metafieldParam, ownerId], context) => {
    const ownerResource = matchOwnerTypeToOwnerResource(ownerType as SupportedMetafieldOwnerType);
    const metafieldSet = CodaMetafieldSet.createFromCodaParameter(metafieldParam);
    const isShopQuery = ownerType === MetafieldOwnerType.Shop;
    if (!isShopQuery && ownerId === undefined) {
      throw new RequiredParameterMissingVisibleError(
        `The ownerID is required when setting metafields from resources other than Shop.`
      );
    }

    const metafieldInstance = metafieldSet.toMetafield({
      context,
      owner_id: isShopQuery ? undefined : ownerId,
      owner_resource: ownerResource,
    });

    await metafieldInstance.saveAndUpdate();
    return metafieldInstance.formatToRow() as any;
  },
});

/**
 * Alternative version of SetMetafield Action. Main benefit is having autocomplete
 * on key, but we have to manually specify if the metafield is a `list`.
 */
// export const Action_SetMetafieldAltVersion = coda.makeFormula({
//   name: 'SetMetafieldAltVersion',
//   description:
//     'Set a metafield of the `list`variant. If the metafield does not exist, it will be created. If it exists and you input an empty string, it will be deleted. Return the metafield data.',
//   connectionRequirement: coda.ConnectionRequirement.Required,
//   parameters: [
//     inputs.metafield.ownerType,
//     inputs.metafield.ownerID,
//     inputs.metafield.fullKeyAutocomplete,
//     coda.makeParameter({
//       type: coda.ParameterType.Boolean,
//       name: 'isListMetafield',
//       description: 'Wether the metafield is a `list` metafield. For example `list.color`, `list.number_decimal`, etc…',
//       suggestedValue: false,
//     }),
//     coda.makeParameter({
//       type: coda.ParameterType.StringArray,
//       name: 'value',
//       description:
//         'A single metafield value or a list of metafield values inside a List() formula. Use one of the `Meta{…}` helper formulas for values.',
//       optional: true,
//       suggestedValue: [],
//     }),
//     coda.makeParameter({
//       type: coda.ParameterType.StringArray,
//       name: 'values',
//       description:
//         'A list of metafield values inside a List() formula. Use one of the `Meta{…}` helper formulas for values.',
//       optional: true,
//       suggestedValue: [],
//     }),
//   ],
//   isAction: true,
//   resultType: coda.ValueType.Object,
//   schema: MetafieldSyncTableSchema,
//   execute: async ([ownerType, ownerId, fullKey, list, values], context) => {
//     let isList = !!list;
//     const parsedValues: Array<CodaMetafieldValue> =
//       values && values.length ? values.map((v: string) => parseAndValidateMetaValueFormulaOutput(v)) : [];
//     const filteredValues = parsedValues.map((v) => (shouldDeleteMetafield(v.value) ? null : v.value)).filter(Boolean);

//     const schemaEffectiveKeys = retrieveObjectSchemaEffectiveKeys(MetafieldSyncTableSchema);
//     const ownerResource = requireResourceWithMetaFieldsByOwnerType(ownerType as MetafieldOwnerType);
//     const ownerGid = idToGraphQlGid(ownerType, ownerId);

//     // Check if the metafield already exists.
//     const ownerMetafields = await Metafield.all({
//       context,
//       ['metafield[owner_id]']: ownerId,
//       ['metafield[owner_resource]']: graphQLToRestMap[ownerType],
//     });
//     const existingMetafield = ownerMetafields.data.find((metafield) => metafield.fullKey === fullKey);

//        const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
//        const metafieldInstance = new Metafield({
//          context,
//          fromRow: {
//            row: {
//              id: existingMetafield?.apiData?.id ?? null,
//              label: fullKey,
//              key: metaKey,
//              namespace: metaNamespace,
//              owner_id: ownerId,
//              owner_type: ownerType,
//              // TODO: fix this
//              /** Si type n'est pas défini, c'est que le user cherche à supprimer le
//               * metafield, du coup on peut mettre n'importe quoi pour contourner
//               * RequiredParameterMissingVisibleError */
//              type: type ?? existingMetafield?.apiData?.type ?? '_',
//              rawValue: value,
//            } as MetafieldRow,
//          },
//        });
//        await metafieldInstance.saveAndUpdate();
//        return metafieldInstance.formatToRow() as any;

//     // Check if the metafield already exists.
//     // const singleMetafieldResponse = await fetchSingleMetafieldGraphQlByKey({ fullKey, ownerGid }, context, {
//     //   cacheTtlSecs: CACHE_DISABLED,
//     // });
//     const findMetafieldsResponse = await fetchMetafieldsGraphQlByKey({ keys: [fullKey], ownerGid }, context, {
//       cacheTtlSecs: CACHE_DISABLED,
//     });
//     const singleMetafieldOwner = findMetafieldsResponse.ownerNode;
//     const singleMetafield = findMetafieldsResponse.metafieldNodes[0];

//     let action: string;
//     if (!filteredValues.length && singleMetafield) {
//       action = 'delete';
//     } else if (singleMetafield) {
//       action = 'update';
//     } else if (filteredValues.length) {
//       action = 'create';
//     }

//     /* ───────────────────────────────────────────────────────────────────────────────
//        A metafield already exists, and the value is empty, we delete the metafield
//     ┌───────────────────────────────────────────────────────────────────────────────── */
//     if (action === 'delete') {
//       const metafieldId = graphQlGidToId(singleMetafield.id);
//       // const metafieldFetcher = new MetafieldRestFetcher(ownerResource, ownerId, context);
//       // await metafieldFetcher.delete(metafieldId);
//       await Metafield.delete({ context, id: metafieldId });
//       // await deleteMetafieldRest(metafieldId, context);

//       // we keep these keys so that we can later recreate the metafield without having to use a button
//       const deletedObj = {
//         id: metafieldId,
//         label: fullKey,
//         owner_id: ownerId,
//         owner_type: ownerResource.graphQl.name,
//         type: singleMetafield.type,
//       };
//       // add all other missing properties and set them to undefined
//       schemaEffectiveKeys.forEach((key) => {
//         if (!deletedObj.hasOwnProperty(key)) {
//           deletedObj[key] = undefined;
//         }
//       });

//       return deletedObj;
//     }

//     if (action === 'update' || action === 'create') {
//       const uniqueTypes = arrayUnique(parsedValues.map((v) => v.type));
//       if (uniqueTypes.length > 1) throw new coda.UserVisibleError('All metafield values must be of the same type.');
//       let finalType: MetafieldTypeValue;
//       if (isList || (action === 'update' && singleMetafield.type.startsWith('list.'))) {
//         isList = true;
//         finalType = `list.${uniqueTypes[0]}` as MetafieldTypeValue;
//       } else {
//         finalType = uniqueTypes[0] as MetafieldTypeValue;
//       }

//       if (!Object.values(METAFIELD_TYPES).includes(finalType)) {
//         throw new coda.UserVisibleError(`Shopify doesn't support metafields of type: \`${finalType}\`.`);
//       }

//       const metafieldFetcher = new MetafieldGraphQlFetcher(ownerResource, context);

//       /* ─────────────────────────────────────────
//          A metafield already exists, we update
//       ┌─────────────────────────────────────────── */
//       if (action === 'update') {
//         if (singleMetafield.type !== finalType) {
//           throw new coda.UserVisibleError(
//             `Type mismatch between the existing metafield you are trying to update (\`${singleMetafield.type}\`) and the provided one (\`${finalType}\`).`
//           );
//         }

//         const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
//         const metafieldsSetInputs: Array<MetafieldsSetInput> = [
//           {
//             key: metaKey,
//             namespace: metaNamespace,
//             ownerId: singleMetafieldOwner.id,
//             type: singleMetafield.type,
//             value: isList || typeof filteredValues[0] !== 'string' ? JSON.stringify(filteredValues) : filteredValues[0],
//           },
//         ];
//         const { response } = await metafieldFetcher.set(metafieldsSetInputs);
//         const metafield = readFragment(
//           metafieldFieldsFragmentWithDefinition,
//           response.body.data.metafieldsSet.metafields[0]
//         ) as MetafieldFragmentWithDefinition;
//         return metafieldFetcher.formatApiToRow(metafield, singleMetafieldOwner);
//       }

//       /* ───────────────────────────
//          We create the metafield
//       ┌───────────────────────────── */
//       if (action === 'create') {
//         const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
//         const metafieldsSetInputs: Array<MetafieldsSetInput> = [
//           {
//             key: metaKey,
//             namespace: metaNamespace,
//             ownerId: ownerGid,
//             type: finalType,
//             value: isList || typeof filteredValues[0] !== 'string' ? JSON.stringify(filteredValues) : filteredValues[0],
//           },
//         ];
//         const { response } = await metafieldFetcher.set(metafieldsSetInputs);
//         const metafield = readFragment(
//           metafieldFieldsFragmentWithDefinition,
//           response.body.data.metafieldsSet.metafields[0]
//         ) as MetafieldFragmentWithDefinition;
//         return metafieldFetcher.formatApiToRow(metafield, singleMetafieldOwner);
//       }
//     }

//     // Do nothing and return empty object
//     const emptyObj = {
//       id: undefined,
//       label: undefined,
//       owner_id: undefined,
//       owner_type: undefined,
//       type: undefined,
//     };
//     schemaEffectiveKeys.forEach((key) => {
//       emptyObj[key] = undefined;
//     });
//     return emptyObj;
//   },
// });

export const Action_DeleteMetafield = coda.makeFormula({
  name: 'DeleteMetafield',
  description: 'delete metafield.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [{ ...inputs.metafield.id, description: 'The ID of the metafield to delete.' }],
  isAction: true,
  resultType: coda.ValueType.Boolean,
  execute: async ([metafieldId], context) => {
    await Metafield.delete({ context, id: metafieldId });
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
    const graphQlResourceName = matchOwnerTypeToResourceName(ownerType as SupportedMetafieldOwnerType);
    const isShopQuery = ownerType === MetafieldOwnerType.Shop;
    if (!isShopQuery && ownerId === undefined) {
      throw new RequiredParameterMissingVisibleError(
        `The ownerID is required when requesting metafields from resources other than Shop.`
      );
    }
    const metafield = await MetafieldGraphQl.find({
      context,
      ownerId: isShopQuery ? undefined : idToGraphQlGid(graphQlResourceName, ownerId),
      metafieldKeys: [fullKey],
      options: { cacheTtlSecs: CACHE_DEFAULT },
    });
    if (metafield) {
      return metafield.formatToRow() as any; //! keep typescript happy
    }

    // TODO: add this error everywhere
    throw new NotFoundVisibleError('Metafield');
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
    // TODO: maybe use graphql ? Notamment pour avoir parentOwnerId pour les variants
    const metafieldOwnerType = ownerType as SupportedMetafieldOwnerType;
    const isShopQuery = metafieldOwnerType === MetafieldOwnerType.Shop;
    if (!isShopQuery && ownerId === undefined) {
      throw new RequiredParameterMissingVisibleError(
        `The ownerID is required when requesting metafields from resources other than Shop.`
      );
    }
    const cacheTtlSecs = CACHE_DISABLED; // Cache is disabled intentionally

    // TODO: need a helper function. @see augmentWithMetafieldsFunction methods
    const response = isShopQuery
      ? await Metafield.all({ context, options: { cacheTtlSecs } })
      : await Metafield.all({
          context,
          options: { cacheTtlSecs },
          ['metafield[owner_id]']: ownerId,
          ['metafield[owner_resource]']: matchOwnerTypeToOwnerResource(ownerType as MetafieldOwnerType),
        });

    return response.data.map((m) => m.formatToRow()) as any[]; //! keep typescript happy
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

// TODO: support all file types, we need a function MetafieldFileImageValue, MetafieldFileVideoValue etc ?
// export const Formula_MetaFileReference = makeMetafieldReferenceValueFormulaDefinition(
//   FIELD_TYPES.file_reference
// );

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

// TODO: need to test this
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

/*
export const Action_TEST_TRANSLATION = coda.makeFormula({
  name: 'SALUT',
  description: 'Get a single metafield by its ID.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    coda.makeParameter({
      type: coda.ParameterType.String,
      name: 'productId',
      description: 'The ID of the metafield.',
    }),
  ],
  isAction: true,
  resultType: coda.ValueType.String,
  execute: async function ([productId, ...varargs], context) {
    const fields = [];
    while (varargs.length > 0) {
      let namespace: string, key: string;
      // Pull the first set of varargs off the list, and leave the rest.
      [namespace, key, ...varargs] = varargs;
      fields.push(`
        ${key}: metafield(namespace: "${namespace}", key: "${key}") {
          ...metafieldFields
        }
      `);
    }

    const mutationQuery = `
      query product($productId: ID!) {
        product(id: $productId) {
          color: metafield(namespace: "lg_traits", key: "color") {
            ...metafieldFields
          }
        }
      }

      fragment metafieldFields on Metafield {
          id
          type
          value
      }
    `;

    const payload = {
      query: mutationQuery,

      variables: {
        productId: productId,
      },
    };

    const { response } = await makeGraphQlRequest({ payload }, context);

    const { body } = response;
    console.log('body', body);
    // return body.data.product.metaobject.id;

    if (body.data.product.color) {
      const mutationQuery = `
        mutation translationsRegister($resourceId: ID!, $translations: [TranslationInput!]!) {
          translationsRegister(resourceId: $resourceId, translations: $translations) {
            userErrors {
              field
              message
            }

            translations {
              key
              value
            }
          }
        }
      `;

      const payload = {
        query: mutationQuery,

        variables: {
          resourceId: body.data.product.color.id,
          translations: [
            {
              locale: 'en',
              key: 'value',
              value: '["black"]',
              translatableContentDigest: createHash('sha256').update(body.data.product.color.value).digest('hex'),
            },
          ],
        },
      };

      return 'OK';
    }
    return 'OK';
  },
});
*/
