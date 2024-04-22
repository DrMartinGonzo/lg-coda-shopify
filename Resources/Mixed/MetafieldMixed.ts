// #region Imports
import * as coda from '@codahq/packs-sdk';

import { NotFoundError, UnsupportedValueError } from '../../Errors/Errors';
import * as PROPS from '../../coda/coda-properties';
import { CACHE_DEFAULT } from '../../constants';
import { MetafieldRow } from '../../schemas/CodaRows.types';
import { getMetafieldDefinitionReferenceSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { MetafieldSyncTableSchema, metafieldSyncTableHelperEditColumns } from '../../schemas/syncTable/MetafieldSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { compareByDisplayKey, deepCopy } from '../../utils/helpers';
import { formatMetafieldValueForApi, getMetaFieldFullKey, splitMetaFieldFullKey } from '../../utils/metafields-utils';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { MetafieldDefinition } from '../GraphQl/MetafieldDefinition';
import { MetafieldGraphQl, SupportedMetafieldOwnerType } from '../GraphQl/MetafieldGraphQl';
import { MetafieldLegacyType, MetafieldType } from '../Mixed/Metafield.types';
import { Metafield, SupportedMetafieldOwnerResource } from '../Rest/Metafield';
import { RestResourcesPlural, RestResourcesSingular, singularToPlural } from '../types/SupportedResource';
import { SupportedMetafieldSyncTable, supportedMetafieldSyncTables } from './SupportedMetafieldSyncTable';

// #region Types

/**
 * This class contains functions shared between
 * {@link Metafield} and {@link  MetafieldGraphQl} resources
 */
export class MetafieldMixed {
  public static readonly DELETED_SUFFIX = ' [deleted]';

  public static getStaticSchema() {
    return MetafieldSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    let augmentedSchema = deepCopy(MetafieldSyncTableSchema);
    const metafieldOwnerType = context.sync?.dynamicUrl as SupportedMetafieldOwnerType;
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
      // @ts-ignore
      augmentedSchema.featuredProperties.push('owner');
    }

    if (supportDefinition) {
      augmentedSchema.properties['definition_id'] = {
        ...PROPS.ID_NUMBER,
        fixedId: 'definition_id',
        fromKey: 'definition_id',
        description: 'The ID of the metafield definition of the metafield, if it exists.',
      };

      augmentedSchema.properties['definition'] = {
        ...getMetafieldDefinitionReferenceSchema(metafieldOwnerType),
        fromKey: 'definition',
        fixedId: 'definition',
        description: 'The metafield definition of the metafield, if it exists.',
      };

      // @ts-ignore: admin_url should always be the last featured property, but Shop doesn't have one
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
  }): Promise<Array<MetafieldDefinition>> {
    console.log('🍏🍏🍏🍏🍏🍏🍏🍏🍏🍏 FETCH');
    return MetafieldDefinition.allForOwner({
      context,
      ownerType,
      includeFakeExtraDefinitions: true,
      options: { cacheTtlSecs: CACHE_DEFAULT },
    });
  }

  public static getAllSupportedSyncTables(): Array<SupportedMetafieldSyncTable> {
    return supportedMetafieldSyncTables;
  }

  public static getSupportedSyncTable(ownerType: MetafieldOwnerType): SupportedMetafieldSyncTable {
    const found = MetafieldMixed.getAllSupportedSyncTables().find((r) => r.ownerType === ownerType);
    if (found) return found;
    throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
  }

  public static listSupportedSyncTables() {
    return MetafieldMixed.getAllSupportedSyncTables()
      .map((r) => ({ display: r.display, value: r.ownerType }))
      .sort(compareByDisplayKey);
  }

  public static requireMatchingMetafieldDefinition(
    fullKey: string,
    metafieldDefinitions: Array<MetafieldDefinition>
  ): MetafieldDefinition {
    const metafieldDefinition = metafieldDefinitions.find((f) => f && f.fullKey === fullKey);
    if (!metafieldDefinition) throw new NotFoundError('MetafieldDefinition');
    return metafieldDefinition;
  }

  public static getMetafieldAdminUrl(
    endpoint: string,
    hasMetafieldDefinition: boolean,
    singular: SupportedMetafieldOwnerResource,
    owner_id: number,
    parentOwnerId?: number
  ): string | undefined {
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

    let admin_url = `${endpoint}/admin/${pathPart}/metafields`;
    if (!hasMetafieldDefinition) {
      admin_url += `/unstructured`;
    }
    return admin_url;
  }

  public static async handleRowUpdate(
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

    const instance = new MetafieldConstructor({
      context,
      fromRow: {
        row: { ...newRow, owner_type: metafieldOwnerType, rawValue: value },
      },
    });

    // const instance: AbstractSyncedRestResource = new (this as any)({ context, fromRow: { row: newRow } });
    await instance.saveAndUpdate();
    return { ...prevRow, ...instance.formatToRow() };
  }

  public static setData(data: any) {
    // Make sure the key property is never the 'full' key, i.e. `${namespace}.${key}`. -> Normalize it.
    const fullkey = getMetaFieldFullKey({ key: data.key, namespace: data.namespace });
    const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullkey);

    data.key = metaKey;
    data.namespace = metaNamespace;
    return data;
  }
}
