// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, graphQlGidToId } from '../../graphql/utils/graphql-utils';

import { MetafieldClient } from '../../Clients/GraphQlClients';
import { ModelWithDeletedFlag } from '../AbstractModel';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

import {
  metafieldFieldsFragment,
  metafieldFieldsFragmentWithDefinition,
  metafieldFieldsFragmentWithDefinitionWithOwner,
} from '../../graphql/metafields-graphql';
import { formatMetafieldDefinitionReference } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { metafieldSyncTableHelperEditColumns } from '../../schemas/syncTable/MetafieldSchema';
import {
  METAFIELD_DELETED_SUFFIX,
  MetafieldNormalizedData,
  deleteMetafield,
  formatMetaFieldValueForSchema,
  getMetaFieldFullKey,
  getMetafieldAdminUrl,
  normalizeMetafieldRow,
  normalizeOwnerRowMetafields,
  ownerTypeToRestOwnerName,
  preprendPrefixToMetaFieldKey,
  shouldDeleteMetafield,
  splitMetaFieldFullKey,
} from '../utils/metafields-utils';

import { FetchRequestOptions } from '../../Clients/Client.types';
import { RequiredParameterMissingVisibleError } from '../../Errors/Errors';
import { CACHE_DISABLED } from '../../constants/cacheDurations-constants';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { PREFIX_FAKE } from '../../constants/strings-constants';
import { MetafieldRow } from '../../schemas/CodaRows.types';
import { getSupportedMetafieldSyncTable } from '../../sync/SupportedMetafieldSyncTable';
import { MetafieldOwnerType, Node } from '../../types/admin.types';
import { isNullish, safeToString } from '../../utils/helpers';
import { CreateMetafieldInstancesFromRowArgs } from '../rest/MetafieldModel';

// #endregion

// #region Types
export type SupportedMetafieldOwnerType =
  | MetafieldOwnerType.Article
  | MetafieldOwnerType.Blog
  | MetafieldOwnerType.Collection
  | MetafieldOwnerType.Customer
  | MetafieldOwnerType.Draftorder
  | MetafieldOwnerType.Location
  | MetafieldOwnerType.MediaImage
  | MetafieldOwnerType.Order
  | MetafieldOwnerType.Page
  | MetafieldOwnerType.Product
  | MetafieldOwnerType.Productvariant
  | MetafieldOwnerType.Shop;

export type SupportedMetafieldOwnerName =
  | (typeof GraphQlResourceNames)['Article']
  | (typeof GraphQlResourceNames)['Blog']
  | (typeof GraphQlResourceNames)['Collection']
  | (typeof GraphQlResourceNames)['Customer']
  | (typeof GraphQlResourceNames)['DraftOrder']
  | (typeof GraphQlResourceNames)['Location']
  | (typeof GraphQlResourceNames)['Order']
  | (typeof GraphQlResourceNames)['Page']
  | (typeof GraphQlResourceNames)['Product']
  | (typeof GraphQlResourceNames)['ProductVariant']
  | (typeof GraphQlResourceNames)['Shop'];

export interface MetafieldNoDefinitionApiData extends ResultOf<typeof metafieldFieldsFragment> {}
export interface MetafieldWithDefinitionApiData extends ResultOf<typeof metafieldFieldsFragmentWithDefinition> {}
export interface MetafieldWithDefinitionWithOwnerApiData
  extends ResultOf<typeof metafieldFieldsFragmentWithDefinitionWithOwner> {}

export interface MetafieldApiData
  extends BaseApiDataGraphQl,
    MetafieldNoDefinitionApiData,
    MetafieldWithDefinitionApiData,
    MetafieldWithDefinitionWithOwnerApiData {}

export interface MetafieldModelData extends BaseModelDataGraphQl, MetafieldApiData, ModelWithDeletedFlag {
  parentNode: Node & {
    /**
     * Used to reference Product Variant parent Product
     */
    parentOwner?: Node;
  };
}
// #endregion

export class MetafieldGraphQlModel extends AbstractModelGraphQl {
  public data: MetafieldModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Metafield;
  protected static readonly graphQlName = GraphQlResourceNames.Metafield;

  private static createInstanceFromMetafieldNormalizedData({
    context,
    normalizedData,
  }: {
    context: coda.ExecutionContext;
    normalizedData: MetafieldNormalizedData;
  }) {
    const {
      parentOwnerId,
      gid,
      ownerId,
      ownerGid,
      definitionGid,
      parentOwnerGid,
      ownerResource,
      createdAt,
      updatedAt,
      definitionId,
      id,
      ...data
    } = normalizedData;
    return MetafieldGraphQlModel.createInstance(context, {
      ...data,
      __typename: 'Metafield',
      id: gid,
      parentNode: ownerGid
        ? {
            id: ownerGid,
            parentOwner: parentOwnerGid ? { id: parentOwnerGid } : undefined,
          }
        : undefined,
      createdAt: safeToString(createdAt),
      updatedAt: safeToString(updatedAt),
      definition: definitionGid ? { id: definitionGid } : undefined,
    } as MetafieldModelData);
  }

  public static async createInstancesFromOwnerRow({
    context,
    ownerRow,
    ownerResource,
    metafieldDefinitions = [],
  }: CreateMetafieldInstancesFromRowArgs): Promise<MetafieldGraphQlModel[]> {
    const normalizedOwnerRowMetafields = await normalizeOwnerRowMetafields({
      context,
      ownerResource,
      ownerRow,
      metafieldDefinitions,
    });
    return normalizedOwnerRowMetafields.map((n) =>
      MetafieldGraphQlModel.createInstanceFromMetafieldNormalizedData({ context, normalizedData: n })
    );
  }

  public static createInstanceFromRow(context: coda.ExecutionContext, row: MetafieldRow) {
    const normalizedData = normalizeMetafieldRow(row);
    return MetafieldGraphQlModel.createInstanceFromMetafieldNormalizedData({ context, normalizedData });
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected setData(data: MetafieldModelData): void {
    // Make sure the key property is never the 'full' key, i.e. `${namespace}.${key}`. -> Normalize it.
    const fullkey = getMetaFieldFullKey(data);
    const { key, namespace } = splitMetaFieldFullKey(fullkey);
    data.key = key;
    data.namespace = namespace;

    super.setData(data);
  }

  protected validateData(data: MetafieldModelData) {
    const missing: string[] = [];
    if (!isNullish(data.value)) {
      if (!data.type) missing.push('type');
    }
    if (data.id && !data.parentNode?.id && data.ownerType !== MetafieldOwnerType.Shop) missing.push('parentNode.id');
    if (!data.ownerType) missing.push('ownerType');
    if (missing.length) {
      throw new RequiredParameterMissingVisibleError(missing.join(', '));
    }
  }

  get client() {
    return MetafieldClient.createInstance(this.context);
  }

  get fullKey() {
    return getMetaFieldFullKey(this.data);
  }
  get prefixedFullKey() {
    return preprendPrefixToMetaFieldKey(this.fullKey);
  }

  protected async getFullFreshData(): Promise<MetafieldModelData | undefined> {
    const options: FetchRequestOptions = { cacheTtlSecs: CACHE_DISABLED };
    if (this.data.id) {
      const found = await this.client.single({ id: this.data.id, options });
      return found ? found.body : undefined;
    } else {
      const search = await this.client.listByOwnerIds({
        metafieldKeys: [this.fullKey],
        ownerIds: [this.data.parentNode?.id],
        options,
      });
      return search.body && search.body.length ? search.body[0] : undefined;
    }
  }

  public async save(): Promise<void> {
    if (shouldDeleteMetafield(this.data.value)) {
      await this.delete();
    } else {
      const response = await this.client.set(this.data);
      if (response) this.setData(response.body);
    }
  }

  public async delete(): Promise<void> {
    this.data = await deleteMetafield<MetafieldGraphQlModel>(this, async () => super.delete());
  }

  public formatValueForOwnerRow() {
    return formatMetaFieldValueForSchema({ value: this.data.value, type: this.data.type });
  }

  public toCodaRow(includeHelperColumns = true): MetafieldRow {
    const { definition, parentNode, ...data } = this.data;
    const ownerId = graphQlGidToId(parentNode?.id);
    const parentOwnerId = graphQlGidToId(parentNode?.parentOwner?.id);

    let obj: Partial<MetafieldRow> = {
      label: this.fullKey + (data.isDeletedFlag ? METAFIELD_DELETED_SUFFIX : ''),
      admin_graphql_api_id: data.id,
      id: graphQlGidToId(data.id),
      key: data.key,
      namespace: data.namespace,
      type: data.type,
      rawValue: data.value,
      updated_at: data.updatedAt,
      created_at: data.createdAt,
      owner_type: data.ownerType,
    };

    if (ownerId) {
      obj.owner_id = ownerId;
      const { formatOwnerReference } = getSupportedMetafieldSyncTable(data.ownerType as MetafieldOwnerType);
      if (formatOwnerReference) {
        obj.owner = formatOwnerReference(ownerId);
      }

      /**
       * Only set the value if maybeAdminUrl is not undefined. Since ownerId is
       * necessary (and parentOwnerId can be necessary for ProductVariants) but
       * undefined when formatting from a two way sync update.
       * Since this value is static, we return nothing to prevent erasing the
       * previous value. We could also retrieve the owner ID value directly in the
       * graphQl mutation result but doing it this way reduce the GraphQL query costs.
       */
      const maybeAdminUrl = getMetafieldAdminUrl(this.context, {
        id: ownerId,
        parentId: parentOwnerId,
        singular: ownerTypeToRestOwnerName(data.ownerType as MetafieldOwnerType),
        hasMetafieldDefinition: !!definition?.id,
      });
      if (maybeAdminUrl) {
        obj.admin_url = maybeAdminUrl;
      }
    }

    if (definition?.id && !definition.id.startsWith(PREFIX_FAKE)) {
      const definitionId = graphQlGidToId(definition.id);
      obj.definition_id = definitionId;
      obj.definition = formatMetafieldDefinitionReference(definitionId);
    }

    if (includeHelperColumns) {
      const helperColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === data.type);
      if (helperColumn) {
        obj[helperColumn.key] = formatMetaFieldValueForSchema({ value: data.value, type: data.type });
      }
    }

    return obj as MetafieldRow;
  }
}
