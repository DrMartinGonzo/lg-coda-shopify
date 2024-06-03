// #region Imports
import * as coda from '@codahq/packs-sdk';

import { FetchRequestOptions } from '../../Clients/Client.types';
import { MetafieldClient, RestRequestReturn } from '../../Clients/RestApiClientBase';
import { RequiredParameterMissingVisibleError } from '../../Errors/Errors';
import { MetafieldDefinition } from '../../Resources/GraphQl/MetafieldDefinition';
import { MetafieldHelper } from '../../Resources/Mixed/MetafieldHelper';
import { SupportedMetafieldOwnerResource } from '../../Resources/Rest/Metafield';
import { GraphQlResourceNames, RestResourcesSingular } from '../../Resources/types/SupportedResource';
import { CACHE_DISABLED, Identity, PACK_IDENTITIES } from '../../constants';
import { BaseRow, MetafieldRow } from '../../schemas/CodaRows.types';
import { formatMetafieldDefinitionReference } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { metafieldSyncTableHelperEditColumns } from '../../schemas/syncTable/MetafieldSchema';
import { logAdmin } from '../../utils/helpers';
import {
  formatMetaFieldValueForSchema,
  matchOwnerResourceToMetafieldOwnerType,
  preprendPrefixToMetaFieldKey,
  shouldDeleteMetafield,
} from '../../utils/metafields-utils';
import { ModelWithDeletedFlag } from '../AbstractModel';
import { AbstractModelRest, BaseApiDataRest, BaseModelDataRest } from './AbstractModelRest';

// #endregion

// #region Types
export interface MetafieldApiData extends BaseApiDataRest {
  key: string | null;
  namespace: string | null;
  value: string | null;
  article_id: number | null;
  blog_id: number | null;
  collection_id: number | null;
  created_at: string | null;
  customer_id: number | null;
  draft_order_id: number | null;
  id: number | null;
  admin_graphql_api_id: string | null;
  order_id: number | null;
  owner_id: number | null;
  owner_resource: SupportedMetafieldOwnerResource | null;
  page_id: number | null;
  product_id: number | null;
  product_image_id: number | null;
  type: string | null;
  updated_at: string | null;
  variant_id: number | null;
  definition_id: number | null;
}

export interface MetafieldModelData extends BaseModelDataRest, MetafieldApiData, ModelWithDeletedFlag {}

export interface CreateMetafieldInstancesFromRowArgs {
  ownerRow: BaseRow;
  ownerResource: SupportedMetafieldOwnerResource;
  metafieldDefinitions?: Array<MetafieldDefinition>;
  context: coda.ExecutionContext;
}
// #endregion

export class MetafieldModel extends AbstractModelRest<MetafieldModel> {
  public data: MetafieldModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Metafield;
  protected static readonly graphQlName = GraphQlResourceNames.Metafield;

  public static async createInstancesFromOwnerRow({
    context,
    ownerRow,
    ownerResource,
    metafieldDefinitions = [],
  }: CreateMetafieldInstancesFromRowArgs): Promise<MetafieldModel[]> {
    const preprocessedMetafieldsData = await MetafieldHelper.normalizeOwnerRowMetafields({
      context,
      ownerResource,
      ownerRow,
      metafieldDefinitions,
    });
    return preprocessedMetafieldsData.map(
      ({ namespace, key, type, ownerResource, definitionId, definitionGid, ownerId, value }) => {
        return MetafieldModel.createInstance(context, {
          namespace,
          key,
          type,
          value,
          owner_id: ownerId,
          owner_resource: ownerResource,
          definition_id: definitionId,
        } as MetafieldApiData);
      }
    );
  }

  public static createInstanceFromRow(context: coda.ExecutionContext, row: MetafieldRow) {
    const { definitionId, deleted, key, namespace, ownerId, ownerResource, type, value, id, gid } =
      MetafieldHelper.normalizeMetafieldRow(row);
    let data: Partial<MetafieldModelData> = {
      admin_graphql_api_id: gid,
      id,
      key,
      namespace,
      owner_id: ownerId,
      owner_resource: ownerResource,
      type,
      value,
      definition_id: definitionId,
      created_at: row.created_at ? row.created_at.toString() : undefined,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,

      isDeletedFlag: deleted,
    };

    return MetafieldModel.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected setData(data: any): void {
    super.setData(MetafieldHelper.normalizeMetafieldData(data));
  }

  protected validateData(data: MetafieldApiData) {
    const missing: string[] = [];
    if (!data.type) missing.push('type');
    if (!data.owner_resource) missing.push('owner_resource');
    if (!data.owner_id && data.owner_resource !== RestResourcesSingular.Shop) missing.push('owner_id');
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

  protected async getFullFreshData(): Promise<MetafieldApiData | undefined> {
    const options: FetchRequestOptions = { cacheTtlSecs: CACHE_DISABLED };
    if (this.data[this.primaryKey]) {
      const found = await this.client.single({ id: this.data.id, options });
      return found ? found.body : undefined;
    } else {
      const search = await this.client.listByKeys({
        metafieldKeys: [this.fullKey],
        owner_id: this.data.owner_id,
        owner_resource: this.data.owner_resource,
        options,
      });
      return search.body && search.body.length ? search.body[0] : undefined;
    }
  }

  public async save(): Promise<void> {
    let response: RestRequestReturn<MetafieldApiData>;
    if (shouldDeleteMetafield(this.data.value)) {
      await this.delete();
    } else {
      if (this.data[this.primaryKey]) {
        response = await this.client.update(this.data);
      } else {
        response = await this.client.create(this.data);
      }
      if (response) {
        this.setData(response.body);
      }
    }
  }

  public async delete(): Promise<void> {
    /** We dont always have the metafield ID but it could still be an existing Metafield, so we need to retrieve its Id */
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
    const ownerType = matchOwnerResourceToMetafieldOwnerType(data.owner_resource);
    const { DELETED_SUFFIX } = MetafieldHelper;

    let obj: Partial<MetafieldRow> = {
      label: this.fullKey + (data.isDeletedFlag ? DELETED_SUFFIX : ''),
      admin_graphql_api_id: data.admin_graphql_api_id,
      id: data.id,
      key: data.key,
      namespace: data.namespace,
      type: data.type,
      rawValue: data.value,
      updated_at: data.updated_at,
      created_at: data.created_at,
      owner_type: ownerType,
    };

    if (data.owner_id) {
      obj.owner_id = data.owner_id;
      const { formatOwnerReference } = MetafieldHelper.getSupportedSyncTable(ownerType);
      if (formatOwnerReference) {
        obj.owner = formatOwnerReference(data.owner_id);
      }

      /**
       * Unlike in {@link MetafieldGraphQl.formatToRow}, we can set this at once
       * since data.owner_id is already checked and owner parentId is never necessary.
       */
      obj.admin_url = MetafieldHelper.getMetafieldAdminUrl(this.context, {
        id: data.owner_id,
        singular: data.owner_resource,
        hasMetafieldDefinition: !!data.definition_id,
      });
    }

    if (data.definition_id) {
      obj.definition_id = data.definition_id;
      obj.definition = formatMetafieldDefinitionReference(data.definition_id);
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
