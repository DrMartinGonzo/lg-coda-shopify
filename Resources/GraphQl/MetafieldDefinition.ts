// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { BaseContext } from '../types/Resource.types';
import { UnsupportedValueError } from '../../Errors/Errors';
import { Sync_MetafieldDefinitions } from '../../coda/setup/metafieldDefinitions-setup';
import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT, Identity, PACK_IDENTITIES, PREFIX_FAKE } from '../../constants';
import {
  getMetafieldDefinitionsQuery,
  getSingleMetafieldDefinitionQuery,
  metafieldDefinitionFragment,
} from '../../graphql/metafieldDefinitions-graphql';
import { MetafieldDefinitionRow } from '../../schemas/CodaRows.types';
import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { MetafieldDefinitionValidationStatus, MetafieldOwnerType } from '../../types/admin.types';
import { compareByDisplayKey } from '../../utils/helpers';
import { FindAllGraphQlResponse, GraphQlResourcePath } from '../Abstract/GraphQl/AbstractGraphQlResource';
import { AbstractSyncedGraphQlResource } from '../Abstract/GraphQl/AbstractSyncedGraphQlResource';
import { MakeSyncGraphQlFunctionArgs, SyncGraphQlFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { METAFIELD_TYPES } from '../Mixed/Metafield.types';
import { SupportedMetafieldSyncTable, supportedMetafieldSyncTables } from '../Mixed/SupportedMetafieldSyncTable';
import { SupportedMetafieldOwnerType } from './MetafieldGraphQl';

// #endregion

// #region Types
interface FindArgs extends BaseContext {
  id: string;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  ownerType: MetafieldOwnerType;
  limit?: number;
  cursor?: string;
}
interface AllForOwnerArgs extends BaseContext {
  [key: string]: unknown;
  ownerType: MetafieldOwnerType;
  includeFakeExtraDefinitions?: boolean;
}
// #endregion

const FAKE_METADEFINITION__SEO_DESCRIPTION = {
  id: `${PREFIX_FAKE}SEO_DESCRIPTION_ID`,
  name: 'SEO Description',
  namespace: 'global',
  key: 'description_tag',
  type: {
    name: METAFIELD_TYPES.single_line_text_field,
  },
  description: 'The meta description.',
  validations: [],
  metafieldsCount: 0,
  pinnedPosition: 1000,
  // ownerType: this.metafieldGraphQlOwnerType,
  validationStatus: MetafieldDefinitionValidationStatus.AllValid,
  visibleToStorefrontApi: true,
};
const FAKE_METADEFINITION__SEO_TITLE = {
  id: `${PREFIX_FAKE}SEO_TITLE_ID`,
  name: 'SEO Title',
  namespace: 'global',
  key: 'title_tag',
  type: {
    name: METAFIELD_TYPES.single_line_text_field,
  },
  description: 'The meta title.',
  validations: [],
  metafieldsCount: 0,
  pinnedPosition: 1001,
  // ownerType: this.metafieldGraphQlOwnerType,
  validationStatus: MetafieldDefinitionValidationStatus.AllValid,
  visibleToStorefrontApi: true,
};

export class MetafieldDefinition extends AbstractSyncedGraphQlResource {
  public apiData: ResultOf<typeof metafieldDefinitionFragment>;

  public static readonly displayName: Identity = PACK_IDENTITIES.MetafieldDefinition;
  protected static readonly paths: Array<GraphQlResourcePath> = ['metafieldDefinition', 'metafieldDefinitions'];
  protected static readonly defaultLimit: number = 50;

  public static getStaticSchema() {
    return MetafieldDefinitionSyncTableSchema;
  }

  public static async getDynamicSchema() {
    return this.getStaticSchema();
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    syncTableManager,
  }: MakeSyncGraphQlFunctionArgs<
    MetafieldDefinition,
    typeof Sync_MetafieldDefinitions
  >): SyncGraphQlFunction<MetafieldDefinition> {
    return async ({ cursor = null, limit }) => {
      const ownerType = context.sync.dynamicUrl as MetafieldOwnerType;

      return this.all({
        context,
        cursor,
        limit,
        ownerType,
        options: { cacheTtlSecs: CACHE_DISABLED },
      });
    };
  }

  public static async find({ id, context, options }: FindArgs): Promise<MetafieldDefinition | null> {
    const result = await this.baseFind<MetafieldDefinition, typeof getSingleMetafieldDefinitionQuery>({
      documentNode: getSingleMetafieldDefinitionQuery,
      variables: { id } as VariablesOf<typeof getSingleMetafieldDefinitionQuery>,
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async all({
    context,
    limit = null,
    cursor = null,
    fields = {},
    ownerType = null,
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllGraphQlResponse<MetafieldDefinition>> {
    const response = await this.baseFind<MetafieldDefinition, typeof getMetafieldDefinitionsQuery>({
      documentNode: getMetafieldDefinitionsQuery,
      variables: {
        limit: limit ?? GRAPHQL_NODES_LIMIT,
        cursor,
        ownerType,

        ...otherArgs,
      } as VariablesOf<typeof getMetafieldDefinitionsQuery>,
      context,
      options,
    });

    return response;
  }

  protected static shouldIncludeFakeExtraDefinitions(ownerType: MetafieldOwnerType) {
    return [
      MetafieldOwnerType.Page,
      MetafieldOwnerType.Product,
      MetafieldOwnerType.Collection,
      MetafieldOwnerType.Blog,
      MetafieldOwnerType.Article,
    ].includes(ownerType);
  }

  public static async allForOwner({
    context,
    ownerType,
    includeFakeExtraDefinitions = true,
    options,
  }: AllForOwnerArgs): Promise<Array<MetafieldDefinition>> {
    const metafieldDefinitions = await MetafieldDefinition.allDataLoop<MetafieldDefinition>({
      context,
      ownerType: ownerType,
      limit: 200,
      options,
    });

    /* Add 'Fake' metafield definitions for SEO metafields */
    if (includeFakeExtraDefinitions && this.shouldIncludeFakeExtraDefinitions(ownerType)) {
      return metafieldDefinitions.concat([
        new MetafieldDefinition({ context, fromData: { ...FAKE_METADEFINITION__SEO_DESCRIPTION, ownerType } }),
        new MetafieldDefinition({ context, fromData: { ...FAKE_METADEFINITION__SEO_TITLE, ownerType } }),
      ]);
    }
    return metafieldDefinitions;
  }

  public static getAllSupportedSyncTables(): Array<SupportedMetafieldSyncTable> {
    return supportedMetafieldSyncTables.filter((r) => r.supportDefinition);
  }
  public static getSupportedSyncTable(ownerType: MetafieldOwnerType): SupportedMetafieldSyncTable {
    const found = MetafieldDefinition.getAllSupportedSyncTables().find((r) => r.ownerType === ownerType);
    if (found) return found;
    throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
  }

  public static listSupportedSyncTables() {
    return MetafieldDefinition.getAllSupportedSyncTables()
      .map((r) => ({
        display: r.display,
        value: r.ownerType,
      }))
      .sort(compareByDisplayKey);
  }

  static async listDynamicSyncTableUrls(context: coda.SyncExecutionContext) {
    return MetafieldDefinition.listSupportedSyncTables().map((r) => ({ ...r, hasChildren: false }));
  }

  static async getDynamicSyncTableName(context: coda.SyncExecutionContext) {
    const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
    const supportedSyncTable = new SupportedMetafieldSyncTable(metafieldOwnerType);
    return `${supportedSyncTable.display} MetafieldDefinitions`;
  }

  static async getDynamicSyncTableDisplayUrl(context: coda.SyncExecutionContext) {
    const metafieldOwnerType = context.sync.dynamicUrl as SupportedMetafieldOwnerType;
    const supportedSyncTable = new SupportedMetafieldSyncTable(metafieldOwnerType);
    return supportedSyncTable.getAdminUrl(context);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get fullKey() {
    const { namespace, key } = this.apiData;
    return `${namespace}.${key}`;
  }

  get adminUrl() {
    const supportedSyncTable = MetafieldDefinition.getSupportedSyncTable(this.apiData.ownerType as MetafieldOwnerType);
    if (!supportedSyncTable.supportDefinition) return;
    return coda.joinUrl(supportedSyncTable.getAdminUrl(this.context), this.restId.toString());
  }

  public async save(): Promise<void> {}
  protected formatToApi() {}

  public formatToRow(): MetafieldDefinitionRow {
    const { apiData: data } = this;

    let obj: MetafieldDefinitionRow = {
      ...data,
      admin_graphql_api_id: data.id,
      id: this.restId,
      admin_url: this.adminUrl,
      type: data.type?.name,
    };

    return obj;
  }
}
