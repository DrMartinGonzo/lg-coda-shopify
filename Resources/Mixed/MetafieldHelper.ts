// #region Imports
import * as coda from '@codahq/packs-sdk';

import { MetafieldDefinitionClient } from '../../Clients/GraphQlApiClientBase';
import { ShopClient } from '../../Clients/RestApiClientBase';
import { NotFoundError, RequiredParameterMissingVisibleError, UnsupportedValueError } from '../../Errors/Errors';
import { CACHE_DEFAULT, PREFIX_FAKE } from '../../constants';
import { ModelWithDeletedFlag } from '../../models/AbstractModel';
import { MetafieldDefinitionModel } from '../../models/graphql/MetafieldDefinitionModel';
import { BaseModelDataRest } from '../../models/rest/AbstractModelRest';
import { BaseRow, MetafieldRow } from '../../schemas/CodaRows.types';
import { getMetafieldDefinitionReferenceSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { MetafieldSyncTableSchema, metafieldSyncTableHelperEditColumns } from '../../schemas/syncTable/MetafieldSchema';
import { CurrencyCode, MetafieldOwnerType } from '../../types/admin.types';
import { graphQlGidToId, idToGraphQlGid } from '../../utils/conversion-utils';
import { compareByDisplayKey, deepCopy, isNullishOrEmpty, logAdmin } from '../../utils/helpers';
import {
  formatMetafieldValueForApi,
  getMetaFieldFullKey,
  matchOwnerResourceToMetafieldOwnerType,
  matchOwnerTypeToOwnerResource,
  matchOwnerTypeToResourceName,
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
  splitMetaFieldFullKey,
} from '../../utils/metafields-utils';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { MetafieldGraphQl } from '../GraphQl/MetafieldGraphQl';
import { SupportedMetafieldOwnerType } from '../../models/graphql/MetafieldGraphQlModel';
import { Metafield } from '../Rest/Metafield';
import { SupportedMetafieldOwnerResource } from '../../models/rest/MetafieldModel';
import {
  GraphQlResourceNames,
  RestResourcesPlural,
  RestResourcesSingular,
  singularToPlural,
} from '../types/SupportedResource';
import { METAFIELD_TYPES, MetafieldLegacyType, MetafieldType } from './METAFIELD_TYPES';
import { SupportedMetafieldSyncTable, supportedMetafieldSyncTables } from './SupportedMetafieldSyncTable';

// #endregion

// #region Types
export interface IMetafield {
  get fullKey(): string;
  get prefixedFullKey(): string;

  formatValueForOwnerRow(): any;
}

export interface MetafieldNormalizedData extends BaseModelDataRest, ModelWithDeletedFlag {
  id: number;
  gid: string;
  namespace: string;
  key: string;
  type: string;
  value: string;
  ownerId: number;
  ownerGid: string;
  /** Used to reference Product Variant parent Product */
  parentOwnerId?: number;
  /** Used to reference Product Variant parent Product */
  parentOwnerGid?: string;
  ownerType: SupportedMetafieldOwnerType;
  ownerResource: SupportedMetafieldOwnerResource;
  definitionId: number;
  definitionGid: string;
  createdAt: string;
  updatedAt: string;
}
// #endregion

/**
 * This class contains functions shared between
 * {@link Metafield} and {@link  MetafieldGraphQl} resources
 */
export class MetafieldHelper {
  public static readonly DELETED_SUFFIX = ' [deleted]';

  public static getStaticSchema() {
    return MetafieldSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    let augmentedSchema = deepCopy(MetafieldSyncTableSchema);
    const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
    const supportedSyncTable = new SupportedMetafieldSyncTable(metafieldOwnerType);

    const { ownerReference, supportDefinition } = supportedSyncTable;

    if (ownerReference !== undefined) {
      augmentedSchema.properties['owner'] = {
        ...ownerReference,
        fromKey: 'owner',
        fixedId: 'owner',
        required: true,
        description: 'A relation to the owner of this metafield.',
      };
      // @ts-expect-error
      augmentedSchema.featuredProperties.push('owner');
    }

    if (supportDefinition) {
      augmentedSchema.properties['definition'] = {
        ...getMetafieldDefinitionReferenceSchema(metafieldOwnerType),
        fromKey: 'definition',
        fixedId: 'definition',
        description: 'The metafield definition of the metafield, if it exists.',
      };

      // @ts-expect-error: admin_url should always be the last featured property, but Shop doesn't have one
      augmentedSchema.featuredProperties.push('admin_url');
    } else {
      delete augmentedSchema.properties.admin_url;
      delete augmentedSchema.linkProperty;
    }

    return augmentedSchema;
  }

  public static async getMetafieldDefinitionsForOwner({
    context,
    ownerType,
  }: {
    context: coda.ExecutionContext;
    ownerType: MetafieldOwnerType;
  }): Promise<Array<MetafieldDefinitionModel>> {
    logAdmin('🍏 getMetafieldDefinitionsForOwner');
    const response = await MetafieldDefinitionClient.createInstance(context).listForOwner({
      ownerType,
      includeFakeExtraDefinitions: true,
      options: { cacheTtlSecs: CACHE_DEFAULT },
    });
    return response.map((data) => MetafieldDefinitionModel.createInstance(context, data));
  }

  public static getAllSupportedSyncTables(): Array<SupportedMetafieldSyncTable> {
    return supportedMetafieldSyncTables;
  }

  public static getSupportedSyncTable(ownerType: MetafieldOwnerType): SupportedMetafieldSyncTable {
    const found = MetafieldHelper.getAllSupportedSyncTables().find((r) => r.ownerType === ownerType);
    if (found) return found;
    throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
  }

  public static listSupportedSyncTables() {
    return MetafieldHelper.getAllSupportedSyncTables()
      .map((r) => ({ display: r.display, value: r.ownerType }))
      .sort(compareByDisplayKey);
  }

  public static requireMatchingMetafieldDefinition(
    fullKey: string,
    metafieldDefinitions: Array<MetafieldDefinitionModel>
  ): MetafieldDefinitionModel {
    const metafieldDefinition = metafieldDefinitions.find((f) => f && f.fullKey === fullKey);
    if (!metafieldDefinition) throw new NotFoundError('MetafieldDefinition');
    return metafieldDefinition;
  }

  public static getMetafieldAdminUrl(
    context: coda.ExecutionContext,
    owner: {
      hasMetafieldDefinition: boolean;
      singular: SupportedMetafieldOwnerResource;
      id: number;
      parentId?: number;
    }
  ): string | undefined {
    const { hasMetafieldDefinition, singular, id: owner_id, parentId: parentOwnerId } = owner;
    const plural = singularToPlural(singular);

    if (owner_id === undefined) return undefined;
    if (singular === RestResourcesSingular.Shop) return undefined;
    if (singular === RestResourcesSingular.ProductVariant && parentOwnerId === undefined) return undefined;

    let pathPart = `${plural}/${owner_id}`;
    if (singular === RestResourcesSingular.ProductVariant) {
      pathPart = `${RestResourcesPlural.Product}/${parentOwnerId}/${plural}/${owner_id}`;
    } else if (singular === RestResourcesSingular.Location) {
      pathPart = `settings/${plural}/${owner_id}`;
    }

    let admin_url = `${context.endpoint}/admin/${pathPart}/metafields`;
    if (!hasMetafieldDefinition) {
      admin_url += `/unstructured`;
    }
    return admin_url;
  }

  public static async createInstanceForUpdate(
    prevRow: MetafieldRow,
    newRow: MetafieldRow,
    context: coda.SyncExecutionContext,
    MetafieldConstructor: typeof Metafield | typeof MetafieldGraphQl
  ) {
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const { type } = prevRow;
    const { rawValue } = newRow;

    // Utilisation de rawValue ou de la valeur de l'helper column adaptée si elle a été utilisée
    let value: string | null = rawValue as string;
    for (let i = 0; i < metafieldSyncTableHelperEditColumns.length; i++) {
      const column = metafieldSyncTableHelperEditColumns[i];
      if (Object.keys(newRow).includes(column.key)) {
        if (type === column.type) {
          /**
           *? Si jamais on implémente une colonne pour les currencies,
           *? il faudra veiller a bien passer le currencyCode a {@link formatMetafieldValueForApi}
           */
          value = formatMetafieldValueForApi(newRow[column.key], type as MetafieldType | MetafieldLegacyType);
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

    return new MetafieldConstructor({
      context,
      fromRow: {
        row: { ...newRow, owner_type: metafieldOwnerType, rawValue: value },
      },
    });
  }

  public static async normalizeOwnerRowMetafields({
    context,
    ownerRow,
    ownerResource,
    metafieldDefinitions = [],
  }: {
    ownerRow: BaseRow;
    ownerResource: SupportedMetafieldOwnerResource;
    metafieldDefinitions?: MetafieldDefinitionModel[];
    context: coda.ExecutionContext;
  }) {
    const { prefixedMetafieldFromKeys } = separatePrefixedMetafieldsKeysFromKeys(Object.keys(ownerRow));
    let currencyCode: CurrencyCode;

    const promises = prefixedMetafieldFromKeys.map(async (fromKey) => {
      const value = ownerRow[fromKey] as any;
      const realFromKey = removePrefixFromMetaFieldKey(fromKey);
      const metafieldDefinition = MetafieldHelper.requireMatchingMetafieldDefinition(realFromKey, metafieldDefinitions);

      const { key, namespace, type, validations, id: metafieldDefinitionGid } = metafieldDefinition.data;
      let formattedValue: string | null;

      if (type.name === METAFIELD_TYPES.money && currencyCode === undefined) {
        currencyCode = await ShopClient.createInstance(context).activeCurrency();
      }

      try {
        formattedValue = formatMetafieldValueForApi(
          value,
          type.name as MetafieldType | MetafieldLegacyType,
          validations,
          currencyCode
        );
      } catch (error) {
        throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${fromKey}.`);
      }

      const ownerType = matchOwnerResourceToMetafieldOwnerType(ownerResource);
      const definitionGid =
        metafieldDefinitionGid && !metafieldDefinitionGid.startsWith(PREFIX_FAKE) ? metafieldDefinitionGid : undefined;

      return {
        id: undefined,
        gid: undefined,
        namespace,
        key,
        type: type.name,
        value: formattedValue,
        ownerId: ownerRow.id as number,
        ownerGid: idToGraphQlGid(matchOwnerTypeToResourceName(ownerType), ownerRow.id),
        ownerType,
        ownerResource,
        definitionId: graphQlGidToId(definitionGid),
        definitionGid,
        createdAt: undefined,
        updatedAt: undefined,
        parentOwnerGid: undefined,
        parentOwnerId: undefined,
        isDeletedFlag: false,
      } as MetafieldNormalizedData;
    });

    return Promise.all(promises);
  }

  public static normalizeMetafieldRow(row: MetafieldRow): MetafieldNormalizedData {
    if (!row.label) throw new RequiredParameterMissingVisibleError('label');

    const { DELETED_SUFFIX } = MetafieldHelper;

    const isDeletedFlag = row.label.includes(DELETED_SUFFIX);
    const fullkey = row.label.split(DELETED_SUFFIX)[0];
    const { metaKey: key, metaNamespace: namespace } = splitMetaFieldFullKey(fullkey);
    const definitionId = row.definition_id || row.definition?.id;
    // Utilisation de rawValue ou de la valeur de l'helper column adaptée si elle a été utilisée
    let value: string | null = row.rawValue as string;
    for (let i = 0; i < metafieldSyncTableHelperEditColumns.length; i++) {
      const column = metafieldSyncTableHelperEditColumns[i];
      if (Object.keys(row).includes(column.key)) {
        if (row.type === column.type) {
          /**
           *? Si jamais on implémente une colonne pour les currencies,
           *? il faudra veiller a bien passer le currencyCode a {@link formatMetafieldValueForApi}
           */
          value = formatMetafieldValueForApi(row[column.key], row.type as MetafieldType | MetafieldLegacyType);
        } else {
          const goodColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === row.type);
          let errorMsg = `Metafield type mismatch. You tried to update using an helper column that doesn't match the metafield type.`;
          if (goodColumn) {
            errorMsg += ` The correct column for type '${row.type}' is: '${goodColumn.key}'.`;
          } else {
            errorMsg += ` You can only update this metafield by directly editing the 'Raw Value' column.`;
          }
          throw new coda.UserVisibleError(errorMsg);
        }
      }
    }

    return {
      id: isDeletedFlag ? null : row.id,
      gid: isDeletedFlag ? null : idToGraphQlGid(GraphQlResourceNames.Metafield, row.id),
      namespace,
      key,
      type: row.type,
      value: isNullishOrEmpty(value) ? null : value,
      ownerId: row.owner_id,
      ownerGid: idToGraphQlGid(
        matchOwnerTypeToResourceName(row.owner_type as SupportedMetafieldOwnerType),
        row.owner_id
      ),
      ownerType: row.owner_type as SupportedMetafieldOwnerType,
      ownerResource: matchOwnerTypeToOwnerResource(row.owner_type as SupportedMetafieldOwnerType),
      definitionId,
      definitionGid: idToGraphQlGid(GraphQlResourceNames.MetafieldDefinition, definitionId),
      createdAt: row.created_at ? row.created_at.toString() : undefined,
      updatedAt: row.updated_at ? row.updated_at.toString() : undefined,
      parentOwnerGid: undefined,
      parentOwnerId: undefined,

      isDeletedFlag,
    };
  }

  public static normalizeMetafieldData(data: any) {
    // Make sure the key property is never the 'full' key, i.e. `${namespace}.${key}`. -> Normalize it.
    const fullkey = getMetaFieldFullKey({ key: data.key, namespace: data.namespace });
    const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullkey);

    data.key = metaKey;
    data.namespace = metaNamespace;
    return data;
  }
}
