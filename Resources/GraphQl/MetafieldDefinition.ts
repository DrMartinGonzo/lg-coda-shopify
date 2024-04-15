// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { CACHE_DISABLED, GRAPHQL_NODES_LIMIT } from '../../constants';
import { Sync_MetafieldDefinitions } from '../../coda/setup/metafieldDefinitions-setup';
import {
  getMetafieldDefinitionsQuery,
  getSingleMetafieldDefinitionQuery,
  metafieldDefinitionFragment,
} from '../../graphql/metafieldDefinitions-graphql';
import { MetafieldDefinitionRow } from '../../schemas/CodaRows.types';
import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { MetafieldDefinitionValidationStatus, MetafieldOwnerType } from '../../types/admin.types';
import {
  FindAllResponse,
  GraphQlResourcePath,
  MakeSyncFunctionArgsGraphQl,
  SyncTableManagerSyncFunction,
} from '../Abstract/GraphQl/AbstractGraphQlResource';
import { AbstractSyncedGraphQlResource } from '../Abstract/GraphQl/AbstractSyncedGraphQlResource';
import { BaseContext, ResourceDisplayName } from '../Abstract/Rest/AbstractRestResource';
import { Metafield } from '../Rest/Metafield';
import { METAFIELD_TYPES } from '../Mixed/Metafield.types';

// #endregion

// #region Types
interface FindArgs extends BaseContext {
  id: string;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  ownerType: MetafieldOwnerType;
  maxEntriesPerRun?: number;
  cursor?: string;
}
interface AllForOwnerArgs extends BaseContext {
  [key: string]: unknown;
  ownerType: MetafieldOwnerType;
  includeFakeExtraDefinitions?: boolean;
}
// #endregion

const FAKE_METADEFINITION__SEO_DESCRIPTION = {
  id: 'FAKE_SEO_DESCRIPTION_ID',
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
  id: 'FAKE_SEO_TITLE_ID',
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

  static readonly displayName = 'MetafieldDefinition' as ResourceDisplayName;
  protected static paths: Array<GraphQlResourcePath> = ['metafieldDefinition', 'metafieldDefinitions.nodes'];
  protected static defaultMaxEntriesPerRun: number = 50;

  public static getStaticSchema() {
    return MetafieldDefinitionSyncTableSchema;
  }

  public static async getDynamicSchema() {
    return this.getStaticSchema();
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    syncTableManager,
  }: MakeSyncFunctionArgsGraphQl<MetafieldDefinition, typeof Sync_MetafieldDefinitions>): SyncTableManagerSyncFunction {
    return async ({ cursor = null, maxEntriesPerRun }) => {
      const ownerType = context.sync.dynamicUrl as MetafieldOwnerType;

      return this.all({
        context,
        cursor,
        maxEntriesPerRun,
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
    maxEntriesPerRun = null,
    cursor = null,
    fields = {},
    ownerType = null,
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<MetafieldDefinition>> {
    const response = await this.baseFind<MetafieldDefinition, typeof getMetafieldDefinitionsQuery>({
      documentNode: getMetafieldDefinitionsQuery,
      variables: {
        maxEntriesPerRun: maxEntriesPerRun ?? GRAPHQL_NODES_LIMIT,
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
      maxEntriesPerRun: 200,
      options,
    });

    /* Add 'Fake' metafield definitions for SEO metafields */
    // const extraDefinitions: Array<ResultOf<typeof metafieldDefinitionFragment>> = [];
    const extraDefinitionsNew: Array<MetafieldDefinition> = [];
    if (includeFakeExtraDefinitions && this.shouldIncludeFakeExtraDefinitions(ownerType)) {
      // extraDefinitions.push({ ...FAKE_METADEFINITION__SEO_DESCRIPTION, ownerType });
      // extraDefinitions.push({ ...FAKE_METADEFINITION__SEO_TITLE, ownerType });

      extraDefinitionsNew.push(
        new MetafieldDefinition({ context, fromData: { ...FAKE_METADEFINITION__SEO_DESCRIPTION, ownerType } })
      );
      extraDefinitionsNew.push(
        new MetafieldDefinition({ context, fromData: { ...FAKE_METADEFINITION__SEO_TITLE, ownerType } })
      );
    }

    // return metafieldDefinitions.map((m) => m.apiData).concat(extraDefinitions);
    return metafieldDefinitions.concat(extraDefinitionsNew);
  }

  static async listDynamicSyncTableUrls(context: coda.SyncExecutionContext) {
    return Metafield.listSupportedSyncTablesWithDefinitions().map((r) => ({
      ...r,
      hasChildren: false,
    }));
  }

  static async getDynamicSyncTableName(context: coda.SyncExecutionContext) {
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const { display } = Metafield.getOwnerInfo(metafieldOwnerType, context);
    return `${display} MetafieldDefinitions`;
  }

  static async getDynamicSyncTableDisplayUrl(context: coda.SyncExecutionContext) {
    const metafieldOwnerType = context.sync.dynamicUrl as MetafieldOwnerType;
    const { adminDefinitionUrl } = Metafield.getOwnerInfo(metafieldOwnerType, context);
    return adminDefinitionUrl;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get fullKey() {
    const { namespace, key } = this.apiData;
    return `${namespace}.${key}`;
  }

  public async save(): Promise<void> {}
  protected formatToApi() {}

  public formatToRow(): MetafieldDefinitionRow {
    const { apiData: data } = this;

    let obj: MetafieldDefinitionRow = {
      ...data,
      admin_graphql_api_id: data.id,
      id: this.restId,
      admin_url: `${this.context.endpoint}/admin/settings/custom_data/${data.ownerType.toLowerCase()}/metafields/${
        this.restId
      }`,
      // ownerType: data.ownerType,
      type: data.type?.name,
    };

    return obj;
  }
}
