// #region Imports
import { ResultOf, VariablesOf } from '../../utils/tada-utils';

import { BaseContext } from '../../Clients/Client.types';
import { GRAPHQL_NODES_LIMIT, PACK_IDENTITIES, Identity } from '../../constants';
import {
  getMetaobjectDefinitionsQuery,
  getSingleMetaObjectDefinitionQuery,
  getSingleMetaobjectDefinitionByTypeQuery,
  metaobjectDefinitionFragment,
} from '../../graphql/metaobjectDefinition-graphql';
import {
  AbstractGraphQlResource,
  FindAllResponse,
  GraphQlResourcePath,
  SaveArgs,
} from '../Abstract/GraphQl/AbstractGraphQlResource';
import { GraphQlResourceNames } from '../types/Resource.types';

// #endregion

// #region Types
interface FieldsArgs {
  capabilities?: boolean;
  fieldDefinitions?: boolean;
}
interface FindArgs extends BaseContext {
  id: string;
  fields?: FieldsArgs;
}
interface FindByTypeArgs extends BaseContext {
  type: string;
  fields?: FieldsArgs;
}

interface AllArgs extends BaseContext {
  [key: string]: unknown;
  maxEntriesPerRun?: number;
  cursor?: string;
  fields?: FieldsArgs;
}

// #endregion

export class MetaobjectDefinition extends AbstractGraphQlResource {
  public apiData: ResultOf<typeof metaobjectDefinitionFragment>;

  public static readonly displayName: Identity = PACK_IDENTITIES.MetaobjectDefinition;
  protected static readonly graphQlName = GraphQlResourceNames.MetaobjectDefinition;

  protected static readonly paths: Array<GraphQlResourcePath> = [
    'metaobjectDefinition',
    'metaobjectDefinitions',
    'metaobjectDefinitionByType',
  ];

  public static async find({ id, fields = {}, context, options }: FindArgs): Promise<MetaobjectDefinition | null> {
    const result = await this.baseFind<MetaobjectDefinition, typeof getSingleMetaObjectDefinitionQuery>({
      documentNode: getSingleMetaObjectDefinitionQuery,
      variables: {
        id,
        includeCapabilities: fields?.capabilities ?? false,
        includeFieldDefinitions: fields?.fieldDefinitions ?? false,
      } as VariablesOf<typeof getSingleMetaObjectDefinitionQuery>,
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async findByType({
    type,
    fields = {},
    context,
    options,
  }: FindByTypeArgs): Promise<MetaobjectDefinition | null> {
    const result = await this.baseFind<MetaobjectDefinition, typeof getSingleMetaobjectDefinitionByTypeQuery>({
      documentNode: getSingleMetaobjectDefinitionByTypeQuery,
      variables: {
        type,
        includeCapabilities: fields?.capabilities ?? false,
        includeFieldDefinitions: fields?.fieldDefinitions ?? false,
      } as VariablesOf<typeof getSingleMetaobjectDefinitionByTypeQuery>,
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
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<MetaobjectDefinition>> {
    const response = await this.baseFind<MetaobjectDefinition, typeof getMetaobjectDefinitionsQuery>({
      documentNode: getMetaobjectDefinitionsQuery,
      variables: {
        maxEntriesPerRun: maxEntriesPerRun ?? GRAPHQL_NODES_LIMIT,
        cursor,
        includeCapabilities: fields?.capabilities ?? false,
        includeFieldDefinitions: fields?.fieldDefinitions ?? false,

        ...otherArgs,
      } as VariablesOf<typeof getMetaobjectDefinitionsQuery>,
      context,
      options,
    });

    return response;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  public async save({ update = false }: SaveArgs): Promise<void> {}
}
