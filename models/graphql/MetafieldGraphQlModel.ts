// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../../utils/tada-utils';

import { MetafieldClient } from '../../Clients/GraphQlApiClientBase';
import { ModelWithDeletedFlag } from '../AbstractModel';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

import { MetafieldHelper } from '../../Resources/Mixed/MetafieldHelper';
import { metafieldFieldsFragment, metafieldFieldsFragmentWithDefinition } from '../../graphql/metafields-graphql';
import { formatMetafieldDefinitionReference } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { metafieldSyncTableHelperEditColumns } from '../../schemas/syncTable/MetafieldSchema';
import {
  formatMetaFieldValueForSchema,
  matchOwnerResourceToMetafieldOwnerType,
  matchOwnerTypeToOwnerResource,
  preprendPrefixToMetaFieldKey,
  shouldDeleteMetafield,
} from '../../utils/metafields-utils';

import { FetchRequestOptions } from '../../Clients/Client.types';
import { RequiredParameterMissingVisibleError } from '../../Errors/Errors';
import { GraphQlResourceNames } from '../../Resources/types/SupportedResource';
import { CACHE_DISABLED, Identity, PACK_IDENTITIES, PREFIX_FAKE } from '../../constants';
import { MetafieldRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType, Node } from '../../types/admin.types';
import { graphQlGidToId } from '../../utils/conversion-utils';
import { logAdmin } from '../../utils/helpers';
import { CreateMetafieldInstancesFromRowArgs } from '../rest/MetafieldModel';

// #endregion

// #region Types
export interface MetafieldApidata
  extends BaseApiDataGraphQl,
    ResultOf<typeof metafieldFieldsFragment>,
    ResultOf<typeof metafieldFieldsFragmentWithDefinition> {
  parentNode: Node & {
    /**
     * Used to reference Product Variant parent Product
     */
    parentOwner?: Node;
  };
}

export interface MetafieldModelData extends BaseModelDataGraphQl, MetafieldApidata, ModelWithDeletedFlag {}
// #endregion

export class MetafieldGraphQlModel extends AbstractModelGraphQl<MetafieldGraphQlModel> {
  public data: MetafieldModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Metafield;
  protected static readonly graphQlName = GraphQlResourceNames.Metafield;

  public static async createInstancesFromOwnerRow({
    context,
    ownerRow,
    ownerResource,
    metafieldDefinitions = [],
  }: CreateMetafieldInstancesFromRowArgs): Promise<MetafieldGraphQlModel[]> {
    const preprocessedMetafieldsData = await MetafieldHelper.normalizeOwnerRowMetafields({
      context,
      ownerResource,
      ownerRow,
      metafieldDefinitions,
    });
    return preprocessedMetafieldsData.map(({ namespace, key, type, ownerGid, ownerResource, definitionGid, value }) => {
      const ownerType = matchOwnerResourceToMetafieldOwnerType(ownerResource);
      return MetafieldGraphQlModel.createInstance(context, {
        __typename: 'Metafield',
        namespace,
        key,
        type,
        ownerType,
        value,
        parentNode: ownerGid ? { id: ownerGid } : undefined,
        definition: definitionGid ? { id: definitionGid } : undefined,
      } as Partial<MetafieldApidata>);
    });
  }

  public static createInstanceFromRow(context: coda.ExecutionContext, row: MetafieldRow) {
    const { definitionGid, deleted, key, namespace, ownerGid, ownerType, type, value, gid } =
      MetafieldHelper.normalizeMetafieldRow(row);
    let data: Partial<MetafieldModelData> = {
      __typename: 'Metafield',
      id: gid,
      key,
      namespace,
      parentNode: ownerGid ? { id: ownerGid } : undefined,
      ownerType,
      type,
      value,
      definition: definitionGid ? { id: definitionGid } : undefined,
      createdAt: row.created_at ? row.created_at.toString() : undefined,
      updatedAt: row.updated_at ? row.updated_at.toString() : undefined,

      isDeletedFlag: deleted,
    };

    return MetafieldGraphQlModel.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected setData(data: any): void {
    super.setData(MetafieldHelper.normalizeMetafieldData(data));
  }

  protected validateData(data: MetafieldApidata) {
    const missing: string[] = [];
    if (!data.type) missing.push('type');
    if (!data.ownerType) missing.push('ownerType');
    console.log('data', data);
    if (!data.parentNode?.id && data.ownerType !== MetafieldOwnerType.Shop) missing.push('parentNode.id');
    if (missing.length) {
      throw new RequiredParameterMissingVisibleError(missing.join(', '));
    }
  }

  get client() {
    return MetafieldClient.createInstance(this.context);
  }

  get fullKey() {
    return `${this.data.namespace}.${this.data.key}`;
  }
  get prefixedFullKey() {
    return preprendPrefixToMetaFieldKey(this.fullKey);
  }

  protected async getFullFreshData(): Promise<MetafieldApidata | undefined> {
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
    if (!this.data[this.primaryKey]) await this.refreshData();

    /** If we have the metafield ID, we can delete it, else it probably means it has already been deleted */
    if (this.data[this.primaryKey]) {
      await super.delete();
    } else {
      logAdmin(`Metafield already deleted.`);
    }

    // make sure to nullify metafield value
    this.data.value = null;
    this.data.isDeletedFlag = true;
  }

  public formatValueForOwnerRow() {
    return formatMetaFieldValueForSchema({
      value: this.data.value,
      type: this.data.type,
    });
  }

  public toCodaRow(includeHelperColumns = true): MetafieldRow {
    const { data } = this;
    const { DELETED_SUFFIX } = MetafieldHelper;
    const ownerId = graphQlGidToId(data.parentNode?.id);
    const parentOwnerId = graphQlGidToId(data.parentNode?.parentOwner?.id);

    let obj: Partial<MetafieldRow> = {
      label: this.fullKey + (data.isDeletedFlag ? DELETED_SUFFIX : ''),
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
      const { formatOwnerReference } = MetafieldHelper.getSupportedSyncTable(data.ownerType as MetafieldOwnerType);
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
      const maybeAdminUrl = MetafieldHelper.getMetafieldAdminUrl(this.context, {
        id: ownerId,
        parentId: parentOwnerId,
        singular: matchOwnerTypeToOwnerResource(data.ownerType as MetafieldOwnerType),
        hasMetafieldDefinition: !!data.definition?.id,
      });
      if (maybeAdminUrl) {
        obj.admin_url = maybeAdminUrl;
      }
    }

    if (data.definition?.id && !data.definition.id.startsWith(PREFIX_FAKE)) {
      const definitionId = graphQlGidToId(data.definition.id);
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
