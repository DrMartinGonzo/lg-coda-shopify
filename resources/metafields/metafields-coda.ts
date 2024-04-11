// #region Imports
import * as coda from '@codahq/packs-sdk';
import { createHash } from 'node:crypto';
import toPascalCase from 'to-pascal-case';

import { AbstractResource_Synced_HasMetafields } from '../../Fetchers/NEW/AbstractResource_Synced_HasMetafields';
import { Metafield, graphQLToRestMap } from '../../Fetchers/NEW/Resources/Metafield';
import { Article } from '../../Fetchers/NEW/Resources/WithRestMetafields/Article';
import { Blog } from '../../Fetchers/NEW/Resources/WithRestMetafields/Blog';
import { Page } from '../../Fetchers/NEW/Resources/WithRestMetafields/Page';
import { CACHE_DEFAULT, CACHE_DISABLED, Identity } from '../../constants';
import { idToGraphQlGid, makeGraphQlRequest } from '../../helpers-graphql';
import { CodaMetafieldKeyValueSet, CodaMetafieldValue } from '../../helpers-setup';
import { MetafieldRow } from '../../schemas/CodaRows.types';
import { MetafieldSyncTableSchema } from '../../schemas/syncTable/MetafieldSchema';
import { filters, inputs } from '../../shared-parameters';
import { CurrencyCode, MetafieldOwnerType } from '../../types/admin.types';
import { arrayUnique } from '../../utils/helpers';
import { GraphQlResourceName } from '../ShopifyResource.types';
import { requireResourceWithMetaFieldsByOwnerType } from '../resources';
import { METAFIELD_TYPES, MetafieldTypeValue } from './Metafield.types';
import { MetafieldGraphQlFetcher } from './MetafieldGraphQlFetcher';
import { MetafieldGraphQlSyncTable } from './MetafieldGraphQlSyncTable';
import { shouldDeleteMetafield } from './utils/metafields-utils';
import {
  parseAndValidateFormatMetafieldFormulaOutput,
  parseAndValidateMetaValueFormulaOutput,
} from './utils/metafields-utils-keyValueSets';
import { splitMetaFieldFullKey } from './utils/metafields-utils-keys';

// #endregion

// #region Helpers
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
          throw new Error(`Unsupported type: ${type}`);
      }

      return JSON.stringify({
        type: METAFIELD_TYPES[type],
        value: idToGraphQlGid(resource, value),
      } as CodaMetafieldValue);
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
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const { display } = Metafield.getOwnerInfo(metafieldOwnerType, context);
    return `${display} Metafields`;
  },
  /* Direct access to the metafield definition settings page for the resource */
  getDisplayUrl: async function (context) {
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const { adminDefinitionUrl: adminUrl } = Metafield.getOwnerInfo(metafieldOwnerType, context);
    return adminUrl;
  },
  getSchema: async function (context, _, formulaContext) {
    const codaSyncParams = Object.values(formulaContext) as coda.ParamValues<coda.ParamDefs>;
    return Metafield.getDynamicSchema({ context, codaSyncParams });
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
      const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
      const ownerResource = requireResourceWithMetaFieldsByOwnerType(metafieldOwnerType);
      const isRestSync = !ownerResource.metafields.useGraphQl;
      const filteredMetafieldKeys = Array.isArray(metafieldKeys)
        ? metafieldKeys.filter((key) => key !== undefined && key !== '')
        : [];
      if (isRestSync) {
        return syncRestResourceMetafields(filteredMetafieldKeys, context);
      } else {
        return syncGraphQlResourceMetafields(filteredMetafieldKeys, context);
      }
    },
    maxUpdateBatchSize: 10,
    executeUpdate: async function (params, updates, context) {
      const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
      const ownerResource = requireResourceWithMetaFieldsByOwnerType(metafieldOwnerType);
      const isRestUpdate = !ownerResource.metafields.useGraphQl;

      // MetafieldDefinitionFragment is included in each GraphQL mutation response, not in Rest
      let metafieldDefinitions: Array<ResultOf<typeof metafieldDefinitionFragment>>;
      if (isRestUpdate) {
        metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(
          { ownerType: ownerResource.metafields.ownerType },
          context
        );
      }

      const jobs = updates.map(async (update) => {
        // 'type' and 'owner_id' are required for the update to work
        if (update.previousValue.owner_id === undefined || update.previousValue.type === undefined) {
          throw new coda.UserVisibleError(
            'You need to have both `Type` and `Owner Id` columns in your table for the update to work'
          );
        }
        const { updatedFields } = update;
        const { type, owner_id } = update.previousValue;

        // We use rawValue as default, but if any helper edit column is set and has matching type, we use its value
        let value: string | null = update.newValue.rawValue as string;
        for (let i = 0; i < metafieldSyncTableHelperEditColumns.length; i++) {
          const item = metafieldSyncTableHelperEditColumns[i];
          if (updatedFields.includes(item.key)) {
            if (type === item.type) {
              value = await formatMetafieldValueForApi(update.newValue[item.key], type, context);
            } else {
              const goodColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === type);
              let errorMsg = `Metafield type mismatch. You tried to update using an helper column that doesn't match the metafield type.`;
              if (goodColumn) {
                errorMsg += ` The correct column for type '${type}' is: '${goodColumn.key}'.`;
              } else {
                errorMsg += ` You can only update this metafield by directly editing the 'Raw Value' column.`;
              }
              throw new coda.UserVisibleError(errorMsg);
            }
          }
        }

        let deletedMetafields: Array<DeletedMetafieldsByKeysRest>;
        let updatedMetafields: Array<RestResources['Metafield']> | Array<MetafieldFragmentWithDefinition>;
        const fullKey = update.previousValue.label as string;
        const metafieldKeyValueSet: CodaMetafieldKeyValueSet = {
          key: fullKey,
          value,
          type,
        };

        if (isRestUpdate) {
          ({ deletedMetafields, updatedMetafields } = await updateResourceMetafieldsRest(
            owner_id,
            ownerResource,
            [metafieldKeyValueSet],
            context
          ));
        } else {
          const ownerGid = idToGraphQlGid(ownerResource.graphQl.name, owner_id);
          ({ deletedMetafields, updatedMetafields } = await updateResourceMetafieldsGraphQl(
            ownerGid,
            [metafieldKeyValueSet],
            context
          ));
        }

        if (updatedMetafields.length) {
          const isGraphQlMetafields = updatedMetafields.every(
            (m) => m.hasOwnProperty('__typename') && m.__typename === GraphQlResourceName.Metafield
          );

          if (isGraphQlMetafields) {
            const updatedMetafield = updatedMetafields[0] as MetafieldFragmentWithDefinition;
            const ownerGid = idToGraphQlGid(ownerResource.graphQl.name, owner_id);
            return {
              ...update.previousValue,
              ...formatMetafieldForSchemaFromGraphQlApi(updatedMetafield, ownerGid, undefined, ownerResource, context),
            };
          } else {
            const updatedMetafield = updatedMetafields[0] as RestResources['Metafield'];
            return {
              ...update.previousValue,
              ...formatMetafieldForSchemaFromGraphQlApi(
                normalizeRestMetafieldResponseToGraphQLResponse(
                  updatedMetafield,
                  ownerResource.metafields.ownerType,
                  metafieldDefinitions
                ),
                idToGraphQlGid(ownerResource.graphQl.name, updatedMetafield.owner_id),
                undefined,
                ownerResource,
                context
              ),
            };
          }
        } else if (deletedMetafields.length) {
          let deletedObj = { ...update.previousValue };
          Object.keys(deletedObj)
            // we keep these keys so that we can later recreate the metafield without having to use a button
            .filter((key) => !['id', 'label', 'owner_id', 'type', 'owner'].includes(key))
            .forEach((key) => {
              delete deletedObj[key];
            });
          return deletedObj;
        }
      });
      const completed = await Promise.allSettled(jobs);
      return {
        result: completed.map((job) => {
          if (job.status === 'fulfilled') return job.value;
          else return job.reason;
        }),
      };
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
  parameters: [inputs.metafield.ownerType, inputs.metafield.ownerID, inputs.general.metafieldValue],
  isAction: true,
  resultType: coda.ValueType.Object,
  schema: MetafieldSyncTableSchema,
  execute: async ([ownerType, ownerId, metafield]: [MetafieldOwnerType, number, string], context) => {
    const metafieldKeyValueSet = parseAndValidateFormatMetafieldFormulaOutput(metafield);
    const { key: fullKey, value } = metafieldKeyValueSet;

    const ownerResource = requireResourceWithMetaFieldsByOwnerType(ownerType);
    const schemaEffectiveKeys = retrieveObjectSchemaEffectiveKeys(MetafieldSyncTableSchema);
    const ownerGid = idToGraphQlGid(ownerType, ownerId);

    // Check if the metafield already exists.
    const singleMetafieldResponse = await fetchSingleMetafieldGraphQlByKey({ fullKey, ownerGid }, context, {
      cacheTtlSecs: CACHE_DISABLED,
    });

    let action: string;
    if (shouldDeleteMetafield(value) && singleMetafieldResponse) {
      action = 'delete';
    } else if (singleMetafieldResponse) {
      action = 'update';
    } else {
      action = 'create';
    }

    /* ───────────────────────────────────────────────────────────────────────────────
       A metafield already exists, and the value is empty, we delete the metafield
    ┌───────────────────────────────────────────────────────────────────────────────── */
    if (action === 'delete') {
      const metafieldId = graphQlGidToId(singleMetafieldResponse.metafieldNode.id);
      await deleteMetafieldRest(metafieldId, context);

      // we keep these keys so that we can later recreate the metafield without having to use a button
      const deletedObj = {
        id: metafieldId,
        label: fullKey,
        owner_id: ownerId,
        owner_type: ownerResource.graphQl.name,
        type: singleMetafieldResponse.metafieldNode.type,
      };
      // add all other missing properties and set them to undefined
      schemaEffectiveKeys.forEach((key) => {
        if (!deletedObj.hasOwnProperty(key)) deletedObj[key] = undefined;
      });
      return deletedObj;
    }

    if (action === 'update' || action === 'create') {
      const finalValue = typeof value === 'string' ? value : JSON.stringify(value);
      const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);

      /* ─────────────────────────────────────────
         A metafield already exists, we update
      ┌─────────────────────────────────────────── */
      if (action === 'update') {
        const metafieldsSetInputs: Array<MetafieldsSetInput> = [
          {
            key: metaKey,
            namespace: metaNamespace,
            ownerId: singleMetafieldResponse.ownerNodeGid,
            type: singleMetafieldResponse.metafieldNode.type,
            value: finalValue,
          },
        ];
        const { response } = await setMetafieldsGraphQl(metafieldsSetInputs, context);
        const metafield = readFragment(
          metafieldFieldsFragmentWithDefinition,
          response.body.data.metafieldsSet.metafields
        )[0] as MetafieldFragmentWithDefinition;

        return formatMetafieldForSchemaFromGraphQlApi(
          metafield,
          singleMetafieldResponse.ownerNodeGid,
          singleMetafieldResponse.parentOwnerNodeGid,
          ownerResource,
          context
        );
      }

      /* ───────────────────────────
         We create the metafield
      ┌───────────────────────────── */
      if (action === 'create') {
        const metafieldsSetInputs: Array<MetafieldsSetInput> = [
          {
            key: metaKey,
            namespace: metaNamespace,
            ownerId: ownerGid,
            type: metafieldKeyValueSet.type,
            value: finalValue,
          },
        ];
        const { response } = await setMetafieldsGraphQl(metafieldsSetInputs, context);
        const metafield = readFragment(
          metafieldFieldsFragmentWithDefinition,
          response.body.data.metafieldsSet.metafields[0]
        ) as MetafieldFragmentWithDefinition;
        return formatMetafieldForSchemaFromGraphQlApi(metafield, ownerGid, undefined, ownerResource, context);
      }
    }

    // Do nothing and return empty object
    const emptyObj = {
      id: undefined,
      label: undefined,
      owner_id: undefined,
      owner_type: undefined,
      type: undefined,
    };
    schemaEffectiveKeys.forEach((key) => {
      emptyObj[key] = undefined;
    });
    return emptyObj;
  },
});

/**
 * Alternative version of SetMetafield Action. Main benefit is having autocomplete
 * on key, but we have to manually specify if the metafield is a `list`.
 */
export const Action_SetMetafieldAltVersion = coda.makeFormula({
  name: 'SetMetafieldAltVersion',
  description:
    'Set a metafield of the `list`variant. If the metafield does not exist, it will be created. If it exists and you input an empty string, it will be deleted. Return the metafield data.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [
    inputs.metafield.ownerType,
    inputs.metafield.ownerID,
    inputs.metafield.fullKeyAutocomplete,
    coda.makeParameter({
      type: coda.ParameterType.Boolean,
      name: 'isListMetafield',
      description: 'Wether the metafield is a `list` metafield. For example `list.color`, `list.number_decimal`, etc…',
      suggestedValue: false,
    }),
    coda.makeParameter({
      type: coda.ParameterType.StringArray,
      name: 'value',
      description:
        'A single metafield value or a list of metafield values inside a List() formula. Use one of the `Meta{…}` helper formulas for values.',
      optional: true,
      suggestedValue: [],
    }),
    coda.makeParameter({
      type: coda.ParameterType.StringArray,
      name: 'values',
      description:
        'A list of metafield values inside a List() formula. Use one of the `Meta{…}` helper formulas for values.',
      optional: true,
      suggestedValue: [],
    }),
  ],
  isAction: true,
  resultType: coda.ValueType.Object,
  schema: MetafieldSyncTableSchema,
  execute: async ([ownerType, ownerId, fullKey, list, values], context) => {
    let isList = !!list;
    const parsedValues: Array<CodaMetafieldValue> =
      values && values.length ? values.map((v: string) => parseAndValidateMetaValueFormulaOutput(v)) : [];
    const filteredValues = parsedValues.map((v) => (shouldDeleteMetafield(v.value) ? null : v.value)).filter(Boolean);

    const schemaEffectiveKeys = retrieveObjectSchemaEffectiveKeys(MetafieldSyncTableSchema);
    const ownerResource = requireResourceWithMetaFieldsByOwnerType(ownerType as MetafieldOwnerType);
    const ownerGid = idToGraphQlGid(ownerType, ownerId);

    // Check if the metafield already exists.
    const singleMetafieldResponse = await fetchSingleMetafieldGraphQlByKey({ fullKey, ownerGid }, context, {
      cacheTtlSecs: CACHE_DISABLED,
    });

    let action: string;
    if (!filteredValues.length && singleMetafieldResponse) {
      action = 'delete';
    } else if (singleMetafieldResponse) {
      action = 'update';
    } else if (filteredValues.length) {
      action = 'create';
    }

    /* ───────────────────────────────────────────────────────────────────────────────
       A metafield already exists, and the value is empty, we delete the metafield
    ┌───────────────────────────────────────────────────────────────────────────────── */
    if (action === 'delete') {
      const metafieldId = graphQlGidToId(singleMetafieldResponse.metafieldNode.id);
      await deleteMetafieldRest(metafieldId, context);

      // we keep these keys so that we can later recreate the metafield without having to use a button
      const deletedObj = {
        id: metafieldId,
        label: fullKey,
        owner_id: ownerId,
        owner_type: ownerResource.graphQl.name,
        type: singleMetafieldResponse.metafieldNode.type,
      };
      // add all other missing properties and set them to undefined
      schemaEffectiveKeys.forEach((key) => {
        if (!deletedObj.hasOwnProperty(key)) {
          deletedObj[key] = undefined;
        }
      });

      return deletedObj;
    }

    if (action === 'update' || action === 'create') {
      const uniqueTypes = arrayUnique(parsedValues.map((v) => v.type));
      if (uniqueTypes.length > 1) throw new coda.UserVisibleError('All metafield values must be of the same type.');
      let finalType: MetafieldTypeValue;
      if (isList || (action === 'update' && singleMetafieldResponse.metafieldNode.type.startsWith('list.'))) {
        isList = true;
        finalType = `list.${uniqueTypes[0]}` as MetafieldTypeValue;
      } else {
        finalType = uniqueTypes[0] as MetafieldTypeValue;
      }

      if (!Object.values(METAFIELD_TYPES).includes(finalType)) {
        throw new coda.UserVisibleError(`Shopify doesn't support metafields of type: \`${finalType}\`.`);
      }

      /* ─────────────────────────────────────────
         A metafield already exists, we update
      ┌─────────────────────────────────────────── */
      if (action === 'update') {
        if (singleMetafieldResponse.metafieldNode.type !== finalType) {
          throw new coda.UserVisibleError(
            `Type mismatch between the existing metafield you are trying to update (\`${singleMetafieldResponse.metafieldNode.type}\`) and the provided one (\`${finalType}\`).`
          );
        }

        const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
        const metafieldsSetInputs: Array<MetafieldsSetInput> = [
          {
            key: metaKey,
            namespace: metaNamespace,
            ownerId: singleMetafieldResponse.ownerNodeGid,
            type: singleMetafieldResponse.metafieldNode.type,
            value: isList || typeof filteredValues[0] !== 'string' ? JSON.stringify(filteredValues) : filteredValues[0],
          },
        ];
        const { response } = await setMetafieldsGraphQl(metafieldsSetInputs, context);
        const metafield = readFragment(
          metafieldFieldsFragmentWithDefinition,
          response.body.data.metafieldsSet.metafields[0]
        ) as MetafieldFragmentWithDefinition;
        return formatMetafieldForSchemaFromGraphQlApi(
          metafield,
          singleMetafieldResponse.ownerNodeGid,
          singleMetafieldResponse.parentOwnerNodeGid,
          ownerResource,
          context
        );
      }

      /* ───────────────────────────
         We create the metafield
      ┌───────────────────────────── */
      if (action === 'create') {
        const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
        const metafieldsSetInputs: Array<MetafieldsSetInput> = [
          {
            key: metaKey,
            namespace: metaNamespace,
            ownerId: ownerGid,
            type: finalType,
            value: isList || typeof filteredValues[0] !== 'string' ? JSON.stringify(filteredValues) : filteredValues[0],
          },
        ];
        const { response } = await setMetafieldsGraphQl(metafieldsSetInputs, context);
        const metafield = readFragment(
          metafieldFieldsFragmentWithDefinition,
          response.body.data.metafieldsSet.metafields[0]
        ) as MetafieldFragmentWithDefinition;
        return formatMetafieldForSchemaFromGraphQlApi(metafield, ownerGid, undefined, ownerResource, context);
      }
    }

    // Do nothing and return empty object
    const emptyObj = {
      id: undefined,
      label: undefined,
      owner_id: undefined,
      owner_type: undefined,
      type: undefined,
    };
    schemaEffectiveKeys.forEach((key) => {
      emptyObj[key] = undefined;
    });
    return emptyObj;
  },
});

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
    const metafieldOwnerType = ownerType as MetafieldOwnerType;
    const ownerResource = requireResourceWithMetaFieldsByOwnerType(metafieldOwnerType);
    const isShopQuery = metafieldOwnerType === MetafieldOwnerType.Shop;
    if (!isShopQuery && ownerId === undefined) {
      throw new coda.UserVisibleError(
        `The ownerID parameter is required when requesting metafields from resources other than Shop.`
      );
    }
    const ownerGid = isShopQuery ? undefined : idToGraphQlGid(ownerResource.graphQl.name, ownerId);
    const singleMetafieldResponse = await fetchSingleMetafieldGraphQlByKey({ fullKey, ownerGid }, context, {
      cacheTtlSecs: CACHE_DISABLED,
    });

    if (singleMetafieldResponse) {
      const { metafieldNode, ownerNodeGid, parentOwnerNodeGid } = singleMetafieldResponse;
      return formatMetafieldForSchemaFromGraphQlApi(
        metafieldNode,
        ownerNodeGid,
        parentOwnerNodeGid,
        ownerResource,
        context,
        false
      ) as any; //! keep typescript happy
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
    const metafieldOwnerType = ownerType as MetafieldOwnerType;
    const ownerResource = requireResourceWithMetaFieldsByOwnerType(metafieldOwnerType);
    const isShopQuery = metafieldOwnerType === MetafieldOwnerType.Shop;
    if (!isShopQuery && ownerId === undefined) {
      throw new coda.UserVisibleError(
        `The ownerID parameter is required when requesting metafields from resources other than Shop.`
      );
    }

    const ownerGid = isShopQuery ? undefined : idToGraphQlGid(ownerResource.graphQl.name, ownerId);
    const cacheTtlSecs = CACHE_DISABLED; // Cache is disabled intentionally
    const { metafieldNodes, ownerNodeGid, parentOwnerNodeGid } = await fetchMetafieldsGraphQlByKey(
      { ownerGid },
      context,
      { cacheTtlSecs }
    );

    if (metafieldNodes) {
      return metafieldNodes.map((metafieldNode) =>
        formatMetafieldForSchemaFromGraphQlApi(metafieldNode, ownerNodeGid, parentOwnerNodeGid, ownerResource, context)
      ) as Array<any>; //! keep typescript happy
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
  execute: async ([fullKey, value]) => {
    if (shouldDeleteMetafield(value)) {
      return JSON.stringify({ key: fullKey, value: null } as CodaMetafieldKeyValueSet);
    }
    const parsedValue = parseAndValidateMetaValueFormulaOutput(value);
    return JSON.stringify({
      key: fullKey,
      type: parsedValue.type,
      value: parsedValue.value,
    } as CodaMetafieldKeyValueSet);
  },
});

export const Formula_FormatListMetafield = coda.makeFormula({
  name: 'FormatListMetafield',
  description: 'Helper function to format values for a `list` metafield.',
  parameters: [inputs.metafield.fullKey],
  varargParameters: [inputs.metafield.value],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([fullKey, ...varargs]) => {
    const values: Array<CodaMetafieldValue> = varargs
      .filter((v) => !shouldDeleteMetafield(v))
      .map((v: string) => parseAndValidateMetaValueFormulaOutput(v));

    if (!varargs.length || !values.length) {
      return JSON.stringify({ key: fullKey, value: null } as CodaMetafieldKeyValueSet);
    }

    const uniqueTypes = arrayUnique(values.map((v) => v.type));
    if (uniqueTypes.length > 1) {
      throw new coda.UserVisibleError('All metafield values must be of the same type.');
    }

    const finalType = ('list.' + uniqueTypes[0]) as MetafieldTypeValue;
    if (!Object.values(METAFIELD_TYPES).includes(finalType)) {
      throw new coda.UserVisibleError(`Shopify doesn't support metafields of type: \`${finalType}\`.`);
    }

    return JSON.stringify({
      key: fullKey,
      type: finalType,
      value: values.map((v) => v.value),
    } as CodaMetafieldKeyValueSet);
  },
});

export const Formula_MetaBoolean = coda.makeFormula({
  name: 'MetaBoolean',
  description: 'Helper function to build a `boolean` metafield value.',
  parameters: [{ ...inputs.metafield.boolean, description: 'True or false ?' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => JSON.stringify({ type: METAFIELD_TYPES.boolean, value } as CodaMetafieldValue),
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
  execute: async ([value]) => JSON.stringify({ type: METAFIELD_TYPES.color, value } as CodaMetafieldValue),
});

export const Formula_MetaDate = coda.makeFormula({
  name: 'MetaDate',
  description: 'Helper function to build a `date` metafield value.',
  parameters: [{ ...inputs.metafield.date, description: 'The date value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => JSON.stringify({ type: METAFIELD_TYPES.date, value } as CodaMetafieldValue),
});

export const Formula_MetaDateTime = coda.makeFormula({
  name: 'MetaDateTime',
  description: 'Helper function to build a `date_time` metafield value.',
  parameters: [{ ...inputs.metafield.date, description: 'The date_time value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => JSON.stringify({ type: METAFIELD_TYPES.date_time, value } as CodaMetafieldValue),
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
  execute: async ([value, unit]) => {
    const obj: CodaMetafieldValue = { type: METAFIELD_TYPES.dimension, value: { value, unit } };
    return JSON.stringify(obj);
  },
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
  execute: async ([value]) => {
    return JSON.stringify({ type: METAFIELD_TYPES.json, value } as CodaMetafieldValue);
  },
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
  execute: async ([amount, currency_code]: [number, CurrencyCode], context) => {
    const obj: CodaMetafieldValue = {
      type: METAFIELD_TYPES.money,
      value: { amount, currency_code },
    };
    return JSON.stringify(obj);
  },
});

export const Formula_MetaMultiLineText = coda.makeFormula({
  name: 'MetaMultiLineText',
  description: 'Helper function to build a `multi_line_text_field` metafield value.',
  parameters: [{ ...inputs.metafield.string, description: 'The text content.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => {
    return JSON.stringify({ type: METAFIELD_TYPES.multi_line_text_field, value } as CodaMetafieldValue);
  },
});

export const Formula_MetaNumberDecimal = coda.makeFormula({
  name: 'MetaNumberDecimal',
  description: 'Helper function to build a `number_decimal` metafield value.',
  parameters: [{ ...inputs.metafield.number, description: 'The decimal number value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => JSON.stringify({ type: METAFIELD_TYPES.number_decimal, value } as CodaMetafieldValue),
});

export const Formula_MetaNumberInteger = coda.makeFormula({
  name: 'MetaNumberInteger',
  description: 'Helper function to build a `number_integer` metafield value.',
  parameters: [{ ...inputs.metafield.number, description: 'The integer value.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) =>
    JSON.stringify({ type: METAFIELD_TYPES.number_integer, value: Math.trunc(value) } as CodaMetafieldValue),
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
  execute: async ([value, scale_min, scale_max]) => {
    const obj: CodaMetafieldValue = {
      type: METAFIELD_TYPES.rating,
      value: { value, scale_min, scale_max },
    };
    return JSON.stringify(obj);
  },
});

export const Formula_MetaSingleLineText = coda.makeFormula({
  name: 'MetaSingleLineText',
  description: 'Helper function to build a `single_line_text_field` metafield value.',
  parameters: [{ ...inputs.metafield.string, description: 'The text content.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => {
    return JSON.stringify({ type: METAFIELD_TYPES.single_line_text_field, value } as CodaMetafieldValue);
  },
});

export const Formula_MetaUrl = coda.makeFormula({
  name: 'MetaUrl',
  description: 'Helper function to build a `url` metafield value.',
  parameters: [{ ...inputs.metafield.string, description: 'The url.' }],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value]) => {
    return JSON.stringify({ type: METAFIELD_TYPES.url, value } as CodaMetafieldValue);
  },
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
  execute: async ([value, unit]) => {
    const obj: CodaMetafieldValue = { type: METAFIELD_TYPES.volume, value: { value, unit } };
    return JSON.stringify(obj);
  },
});

export const Formula_MetaWeight = coda.makeFormula({
  name: 'MetaWeight',
  description: 'Helper function to build a `weight` metafield value.',
  parameters: [{ ...inputs.metafield.number, description: 'The weight value.' }, inputs.metafield.weightUnitGraphQl],
  resultType: coda.ValueType.String,
  connectionRequirement: coda.ConnectionRequirement.None,
  execute: async ([value, unit]) => {
    const obj: CodaMetafieldValue = { type: METAFIELD_TYPES.weight, value: { value, unit } };
    return JSON.stringify(obj);
  },
});

export const Formula_MetaCollectionReference = makeMetafieldReferenceValueFormulaDefinition(
  METAFIELD_TYPES.collection_reference
);
// #endregion

export const Action_SALUT = coda.makeFormula({
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

    const { response } = await makeGraphQlRequest<any>({ payload }, context);

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
