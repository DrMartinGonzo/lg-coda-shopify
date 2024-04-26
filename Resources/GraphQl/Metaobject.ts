// #region Imports
import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import * as PROPS from '../../coda/coda-properties';
import { ResultOf, VariablesOf, readFragment, readFragmentArray } from '../../utils/tada-utils';

import { MakeSyncGraphQlFunctionArgs, SyncGraphQlFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Metaobjects } from '../../coda/setup/metaobjects-setup';
import {
  CACHE_DEFAULT,
  CACHE_DISABLED,
  GRAPHQL_NODES_LIMIT,
  Identity,
  OPTIONS_METAOBJECT_STATUS,
  PACK_IDENTITIES,
} from '../../constants';
import {
  metaobjectDefinitionFragment,
  metaobjectFieldDefinitionFragment,
} from '../../graphql/metaobjectDefinition-graphql';
import {
  createMetaobjectMutation,
  deleteMetaobjectMutation,
  getMetaObjectsWithFieldsQuery,
  getSingleMetaObjectWithFieldsQuery,
  metaobjectFragment,
  updateMetaObjectMutation,
} from '../../graphql/metaobjects-graphql';
import { MetaobjectRow } from '../../schemas/CodaRows.types';
import { mapMetaFieldToSchemaProperty } from '../../schemas/schema-utils';
import { MetaObjectSyncTableBaseSchema } from '../../schemas/syncTable/MetaObjectSchema';
import { CurrencyCode, MetaobjectStatus } from '../../types/admin.types';
import { graphQlGidToId, idToGraphQlGid } from '../../utils/conversion-utils';
import {
  capitalizeFirstChar,
  compareByDisplayKey,
  deepCopy,
  deleteUndefinedInObject,
  isNullishOrEmpty,
  isString,
} from '../../utils/helpers';
import {
  formatMetaFieldValueForSchema,
  formatMetafieldValueForApi,
  shouldUpdateSyncTableMetafieldValue,
} from '../../utils/metafields-utils';
import { requireMatchingMetaobjectFieldDefinition } from '../../utils/metaobjects-utils';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import {
  AbstractGraphQlResource,
  FindAllGraphQlResponse,
  GraphQlResourcePath,
  SaveArgs,
} from '../Abstract/GraphQl/AbstractGraphQlResource';
import { METAFIELD_TYPES, MetafieldType } from '../Mixed/Metafield.types';
import { Shop } from '../Rest/Shop';
import { BaseContext, ResourceConstructorArgs } from '../types/Resource.types';
import { GraphQlResourceNames } from '../types/SupportedResource';
import { MetaobjectDefinition } from './MetaobjectDefinition';

// #endregion

// #region Types
export interface FromMetaobjectRow {
  row: Partial<MetaobjectRow> | null;
  metaobjectFields?: Array<MetaobjectField>;
}

interface MetaobjectConstructorArgs extends ResourceConstructorArgs {
  fromRow?: FromMetaobjectRow;
}

type MetaobjectField = ResultOf<typeof metaobjectFragment>['fields'][number];
type MetaobjectUpdateInput = VariablesOf<typeof updateMetaObjectMutation>['metaobject'];
type MetaobjectCreateInput = VariablesOf<typeof createMetaobjectMutation>['metaobject'];

interface FieldsArgs {
  capabilities?: boolean;
  definition?: boolean;
  fieldDefinitions?: boolean;
}
interface FindArgs extends BaseContext {
  id: string;
  fields?: FieldsArgs;
  metafieldKeys?: Array<string>;
}
interface DeleteArgs extends BaseContext {
  id: string;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  type: string;
  limit?: number;
  cursor?: string;
  fields?: FieldsArgs;
}
// #endregion

export class Metaobject extends AbstractGraphQlResource {
  public apiData: ResultOf<typeof metaobjectFragment>;

  public static readonly displayName: Identity = PACK_IDENTITIES.Metaobject;
  protected static readonly graphQlName = GraphQlResourceNames.Metaobject;

  protected static readonly defaultLimit: number = 50;
  protected static readonly paths: Array<GraphQlResourcePath> = [
    'metaobject',
    'metaobjects',
    'metaobjectCreate.metaobject',
    'metaobjectUpdate.metaobject',
  ];

  public static encodeDynamicUrl(metaobjectDefinition: ResultOf<typeof metaobjectDefinitionFragment>): string {
    return graphQlGidToId(metaobjectDefinition.id).toString();
  }

  public static decodeDynamicUrl(dynamicUrl: string) {
    return {
      id: idToGraphQlGid(GraphQlResourceNames.MetaobjectDefinition, parseInt(dynamicUrl, 10)),
    };
  }

  public static getStaticSchema() {
    return MetaObjectSyncTableBaseSchema;
  }

  public static async getDynamicSchema({ context }: GetSchemaArgs) {
    const { id: metaobjectDefinitionId } = Metaobject.decodeDynamicUrl(context.sync.dynamicUrl);
    const metaobjectDefinition = await MetaobjectDefinition.find({
      context,
      id: metaobjectDefinitionId,
      fields: {
        fieldDefinitions: true,
        capabilities: true,
      },
      options: { cacheTtlSecs: CACHE_DISABLED },
    });
    const { displayNameKey, capabilities } = metaobjectDefinition.apiData;
    const fieldDefinitions = readFragment(
      metaobjectFieldDefinitionFragment,
      metaobjectDefinition.apiData.fieldDefinitions
    );
    const isPublishable = capabilities?.publishable?.enabled;
    let defaultDisplayProperty = 'handle';

    let augmentedSchema = deepCopy(this.getStaticSchema());

    if (isPublishable) {
      augmentedSchema.properties['status'] = {
        ...PROPS.SELECT_LIST,
        fixedId: 'status',
        description: `The status of the metaobject`,
        mutable: true,
        options: OPTIONS_METAOBJECT_STATUS.filter((s) => s.value !== '*').map((s) => s.value),
        requireForUpdates: true,
      };
    }

    fieldDefinitions.forEach((fieldDefinition) => {
      const name = accents.remove(fieldDefinition.name);
      const property = mapMetaFieldToSchemaProperty(fieldDefinition);
      if (property) {
        property.displayName = fieldDefinition.name;
        augmentedSchema.properties[name] = property;

        if (displayNameKey === fieldDefinition.key) {
          // @ts-ignore
          augmentedSchema.displayProperty = name;
          augmentedSchema.properties[name].required = true;
          // @ts-ignore
          augmentedSchema.featuredProperties[augmentedSchema.featuredProperties.indexOf(defaultDisplayProperty)] = name;
        }
      }
    });

    // @ts-ignore: admin_url should always be the last featured property, regardless of any custom field keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    syncTableManager,
  }: MakeSyncGraphQlFunctionArgs<Metaobject, typeof Sync_Metaobjects>): SyncGraphQlFunction<Metaobject> {
    const fields: AllArgs['fields'] = {
      capabilities: syncTableManager.effectiveStandardFromKeys.includes('status'),
      definition: false,
      fieldDefinitions: false,
    };

    return async ({ cursor = null, limit }) => {
      const { id: metaobjectDefinitionId } = Metaobject.decodeDynamicUrl(context.sync.dynamicUrl);
      const type =
        syncTableManager.prevContinuation?.extraData?.type ??
        (
          await MetaobjectDefinition.find({
            context,
            id: metaobjectDefinitionId,
            options: { cacheTtlSecs: CACHE_DEFAULT },
          })
        ).apiData?.type;

      syncTableManager.extraContinuationData = {
        type,
      };

      return this.all({
        context,
        type,
        fields,
        cursor,
        limit,
        options: { cacheTtlSecs: CACHE_DISABLED },
      });
    };
  }

  public static async find({ id, fields = {}, context, options }: FindArgs): Promise<Metaobject | null> {
    const result = await this.baseFind<Metaobject, typeof getSingleMetaObjectWithFieldsQuery>({
      documentNode: getSingleMetaObjectWithFieldsQuery,
      variables: {
        id,
        includeCapabilities: fields?.capabilities ?? false,
        includeDefinition: fields?.definition ?? false,
        includeFieldDefinitions: fields?.fieldDefinitions ?? false,
      } as VariablesOf<typeof getSingleMetaObjectWithFieldsQuery>,
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context, options }: DeleteArgs) {
    return this.baseDelete<typeof deleteMetaobjectMutation>({
      documentNode: deleteMetaobjectMutation,
      variables: {
        id,
      },
      context,
      options,
    });
  }

  public static async all({
    context,
    limit = null,
    cursor = null,
    fields = {},
    type = null,
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllGraphQlResponse<Metaobject>> {
    let searchQuery = '';

    const response = await this.baseFind<Metaobject, typeof getMetaObjectsWithFieldsQuery>({
      documentNode: getMetaObjectsWithFieldsQuery,
      variables: {
        limit: limit ?? GRAPHQL_NODES_LIMIT,
        cursor,
        searchQuery,

        type,
        includeCapabilities: fields?.capabilities ?? true,
        includeDefinition: fields?.definition ?? true,
        includeFieldDefinitions: fields?.fieldDefinitions ?? true,

        ...otherArgs,
      } as VariablesOf<typeof getMetaObjectsWithFieldsQuery>,
      context,
      options,
    });

    return response;
  }

  // TODO: try to not make it async by prefetching and caching shop currency before ?
  protected static async formatMetaobjectFieldsFromRow(
    row: MetaobjectRow,
    metaobjectFieldDefinitions: Array<ResultOf<typeof metaobjectFieldDefinitionFragment>>,
    context: coda.SyncExecutionContext
  ): Promise<Array<MetaobjectField>> {
    const metaobjectFieldFromKeys = Object.keys(row).filter((key) => !['id', 'handle', 'status'].includes(key));
    let currencyCode: CurrencyCode;

    return Promise.all(
      metaobjectFieldFromKeys.map(async (fromKey): Promise<MetaobjectField> => {
        const value = row[fromKey] as string;
        const fieldDefinition = requireMatchingMetaobjectFieldDefinition(fromKey, metaobjectFieldDefinitions);

        if (fieldDefinition.type.name === METAFIELD_TYPES.money && currencyCode === undefined) {
          currencyCode = await Shop.activeCurrency({ context });
        }

        let formattedValue: string;
        try {
          formattedValue = formatMetafieldValueForApi(
            value,
            fieldDefinition.type.name as MetafieldType,
            fieldDefinition.validations,
            currencyCode
          );
        } catch (error) {
          throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${fromKey}.`);
        }

        return {
          key: fromKey,
          value: formattedValue ?? '',
          type: fieldDefinition.type.name,
        };
      })
    );
  }

  // TODO: improve this
  protected static async handleRowUpdate(
    prevRow: MetaobjectRow,
    newRow: MetaobjectRow,
    context: coda.SyncExecutionContext
  ) {
    const { id: metaObjectDefinitionId } = this.decodeDynamicUrl(context.sync.dynamicUrl);
    const metaobjectDefinition = await MetaobjectDefinition.find({
      context,
      id: metaObjectDefinitionId,
      fields: { fieldDefinitions: true },
      options: { cacheTtlSecs: CACHE_DEFAULT },
    });

    const fieldDefinitions = readFragmentArray(
      metaobjectFieldDefinitionFragment,
      metaobjectDefinition.apiData.fieldDefinitions
    );
    const metaobjectFields = await this.formatMetaobjectFieldsFromRow(newRow, fieldDefinitions, context);
    const instance = new Metaobject({
      context,
      fromRow: {
        row: newRow,
        metaobjectFields,
      },
    });

    await instance.saveAndUpdate();
    return { ...prevRow, ...instance.formatToRow() };
  }

  public static parseMetaobjectFieldsFromVarArgs(varargs: Array<any>) {
    const fields: Array<MetaobjectField> = [];
    while (varargs.length > 0) {
      let key: string, value: string;
      [key, value, ...varargs] = varargs;
      fields.push({
        key,
        // value should always be a string
        value: isString(value) ? value : JSON.stringify(value),
        /**
         * We dont' care about the type since
         * parseMetaobjectFieldInputsFromVarArgs is only used for
         * creating/updating and type is not needed for these mutations
         */
        type: undefined,
      });
    }
    return fields;
  }

  static async listDynamicSyncTableUrls(context) {
    const metaobjectDefinitions = await MetaobjectDefinition.allDataLoop<MetaobjectDefinition>({
      context,
      options: { cacheTtlSecs: CACHE_DEFAULT },
    });

    return metaobjectDefinitions.length
      ? metaobjectDefinitions
          .map((definition) => ({
            display: definition.apiData.name,
            /** Use id instead of type as an identifier because
             * its easier to link back to the metaobject dynamic sync table while using {@link getMetaobjectReferenceSchema} */
            value: Metaobject.encodeDynamicUrl(definition.apiData),
          }))
          .sort(compareByDisplayKey)
      : [];
  }

  static async getDynamicSyncTableName(context: coda.SyncExecutionContext) {
    const metaobjectDefinition = await MetaobjectDefinition.find({
      context,
      id: Metaobject.decodeDynamicUrl(context.sync.dynamicUrl).id,
      options: { cacheTtlSecs: CACHE_DEFAULT },
    });
    return `${capitalizeFirstChar(metaobjectDefinition.apiData.type)} Metaobjects`;
  }

  static async getDynamicSyncTableDisplayUrl(context: coda.SyncExecutionContext) {
    const metaobjectDefinition = await MetaobjectDefinition.find({
      context,
      id: Metaobject.decodeDynamicUrl(context.sync.dynamicUrl).id,
      options: { cacheTtlSecs: CACHE_DEFAULT },
    });
    return `${context.endpoint}/admin/content/entries/${metaobjectDefinition.apiData.type}`;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  constructor(params: MetaobjectConstructorArgs) {
    super(params);
  }

  public async save({ update = false }: SaveArgs): Promise<void> {
    const { primaryKey } = Metaobject;
    const isUpdate = this.apiData[primaryKey];

    const documentNode = isUpdate ? updateMetaObjectMutation : createMetaobjectMutation;
    const input = isUpdate ? this.formatMetaobjectUpdateInput() : this.formatMetaobjectCreateInput();

    if (input) {
      const variables = isUpdate
        ? ({
            id: this.graphQlGid,
            metaobject: input,
            includeDefinition: false,
            includeCapabilities: input.hasOwnProperty('capabilities'),
            includeFieldDefinitions: false,
          } as VariablesOf<typeof updateMetaObjectMutation>)
        : ({
            metaobject: input,
          } as VariablesOf<typeof createMetaobjectMutation>);

      await this._baseSave<typeof documentNode>({ documentNode, variables, update });
    }
  }

  formatMetaobjectCreateInput(): MetaobjectCreateInput | undefined {
    let input = this.formatMetaobjectUpdateInput() as MetaobjectCreateInput;
    if (input) {
      input.type = this.apiData.type;
    }
    input = deleteUndefinedInObject(input);

    // If no input, we have nothing to update.
    return Object.keys(input).length === 0 ? undefined : input;
  }

  formatMetaobjectUpdateInput(): MetaobjectUpdateInput | undefined {
    let input: MetaobjectUpdateInput = {
      capabilities: this.apiData.capabilities,
      handle: this.apiData.handle,
      fields: this.apiData.fields.map((f) => ({ key: f.key, value: f.value })),
    };

    input.fields = deleteUndefinedInObject(input.fields);
    input = deleteUndefinedInObject(input);

    // If no input, we have nothing to update.
    return Object.keys(input).length === 0 ? undefined : input;
  }

  protected formatToApi({ row, metaobjectFields = [] }: FromMetaobjectRow) {
    let apiData: Partial<typeof this.apiData> = {
      id: row.id ? idToGraphQlGid(GraphQlResourceNames.Metaobject, row.id) : undefined,
      fields: metaobjectFields,
      type: row.type,

      handle: isNullishOrEmpty(row.handle) ? undefined : row.handle,
      capabilities: isNullishOrEmpty(row.status)
        ? undefined
        : { publishable: { status: row.status as MetaobjectStatus } },
    };

    return apiData;
  }

  public formatToRow(): MetaobjectRow {
    const { apiData: data } = this;

    let obj: MetaobjectRow = {
      id: this.restId,
      admin_graphql_api_id: this.graphQlGid,
      handle: data.handle,
      admin_url: `${this.context.endpoint}/admin/content/entries/${data.type}/${this.restId}`,
      status: data.capabilities?.publishable?.status,
      updatedAt: data.updatedAt,
    };

    if (data.capabilities?.publishable?.status) {
      obj.status = data.capabilities.publishable.status;
    }

    if (data.fields.length) {
      data.fields
        .filter((field) => shouldUpdateSyncTableMetafieldValue(field.type))
        .forEach((field) => {
          obj[field.key] = formatMetaFieldValueForSchema({
            value: field.value,
            type: field.type,
          });
        });
    }

    return obj;
  }
}
