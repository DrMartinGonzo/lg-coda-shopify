// #region Imports
import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import { ResultOf, VariablesOf, readFragment, readFragmentArray } from '../../../utils/graphql';

import { CACHE_DEFAULT, CACHE_DISABLED, GRAPHQL_NODES_LIMIT, OPTIONS_METAOBJECT_STATUS } from '../../../constants';
import { graphQlGidToId, idToGraphQlGid } from '../../../helpers-graphql';
import { GraphQlResourceName, RestResourceSingular } from '../../../resources/ShopifyResource.types';
import { AllMetafieldTypeValue, METAFIELD_TYPES } from '../../../resources/metafields/Metafield.types';
import { shouldUpdateSyncTableMetafieldValue } from '../../../resources/metafields/utils/metafields-utils';
import { formatMetafieldValueForApi } from '../../../resources/metafields/utils/metafields-utils-formatToApi';
import { formatMetaFieldValueForSchema } from '../../../resources/metafields/utils/metafields-utils-formatToRow';
import { Sync_Metaobjects } from '../../../resources/metaobjects/metaobjects-coda';
import {
  fetchAllMetaObjectDefinitions,
  fetchSingleMetaObjectDefinition,
  requireMatchingMetaobjectFieldDefinition,
} from '../../../resources/metaobjects/metaobjects-functions';
import {
  createMetaobjectMutation,
  deleteMetaobjectMutation,
  getMetaObjectsWithFieldsQuery,
  getSingleMetaObjectWithFieldsQuery,
  metaobjectDefinitionFragment,
  metaobjectFieldDefinitionFragment,
  metaobjectFragment,
  updateMetaObjectMutation,
} from '../../../resources/metaobjects/metaobjects-graphql';
import { MetaobjectRow } from '../../../schemas/CodaRows.types';
import { mapMetaFieldToSchemaProperty } from '../../../schemas/schema-helpers';
import { MetaObjectSyncTableBaseSchema } from '../../../schemas/syncTable/MetaObjectSchema';
import { CurrencyCode, MetaobjectStatus } from '../../../types/admin.types';
import {
  capitalizeFirstChar,
  compareByDisplayKey,
  deepCopy,
  deleteUndefinedInObject,
  isNullOrEmpty,
  isString,
} from '../../../utils/helpers';
import {
  AbstractGraphQlResource_Synced,
  FindAllResponse,
  GraphQlResourcePath,
  MakeSyncFunctionArgsGraphQl,
  SaveArgs,
  SyncFunctionGraphQl,
} from '../AbstractGraphQlResource';
import { BaseConstructorArgs, BaseContext, ResourceDisplayName } from '../AbstractResource';
import { GetSchemaArgs } from '../AbstractResource_Synced';
import { Shop } from './Shop';

// #endregion

// #region Types
interface MetaobjectConstructorArgs extends BaseConstructorArgs {
  fromRow?: FromMetaobjectRow;
}

type MetaobjectField = ResultOf<typeof metaobjectFragment>['fields'][number];
type MetaobjectUpdateInput = VariablesOf<typeof updateMetaObjectMutation>['metaobject'];
type MetaobjectCreateInput = VariablesOf<typeof createMetaobjectMutation>['metaobject'];

export interface FromMetaobjectRow {
  row: Partial<MetaobjectRow> | null;
  metaobjectFields?: Array<MetaobjectField>;
}

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
  maxEntriesPerRun?: number;
  cursor?: string;
  fields?: FieldsArgs;
}

// #endregion

export class Metaobject extends AbstractGraphQlResource_Synced {
  public apiData: ResultOf<typeof metaobjectFragment>;

  static readonly displayName = 'Metaobject' as ResourceDisplayName;
  protected static paths: Array<GraphQlResourcePath> = [
    'metaobject',
    'metaobjects.nodes',
    'metaobjectCreate.metaobject',
    'metaobjectUpdate.metaobject',
  ];
  protected static defaultMaxEntriesPerRun: number = 50;

  public static encodeDynamicUrl(metaobjectDefinition: ResultOf<typeof metaobjectDefinitionFragment>): string {
    return graphQlGidToId(metaobjectDefinition.id).toString();
  }

  public static decodeDynamicUrl(dynamicUrl: string) {
    return {
      id: idToGraphQlGid(GraphQlResourceName.MetaobjectDefinition, parseInt(dynamicUrl, 10)),
    };
  }

  public static getStaticSchema() {
    return MetaObjectSyncTableBaseSchema;
  }

  public static async getDynamicSchema({ context }: GetSchemaArgs) {
    const { id: metaobjectDefinitionId } = Metaobject.decodeDynamicUrl(context.sync.dynamicUrl);
    const metaobjectDefinition = await fetchSingleMetaObjectDefinition(
      {
        gid: metaobjectDefinitionId,
        includeCapabilities: true,
        includeFieldDefinitions: true,
      },
      context
    );
    const { displayNameKey } = metaobjectDefinition;
    const fieldDefinitions = readFragment(metaobjectFieldDefinitionFragment, metaobjectDefinition.fieldDefinitions);
    const isPublishable = metaobjectDefinition.capabilities?.publishable?.enabled;
    let defaultDisplayProperty = 'handle';

    let augmentedSchema = deepCopy(this.getStaticSchema());

    if (isPublishable) {
      augmentedSchema.properties['status'] = {
        type: coda.ValueType.String,
        codaType: coda.ValueHintType.SelectList,
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

  protected static makeSyncFunction({
    context,
    syncTableManager,
  }: MakeSyncFunctionArgsGraphQl<Metaobject, typeof Sync_Metaobjects>): SyncFunctionGraphQl {
    const fields: AllArgs['fields'] = {
      capabilities: syncTableManager.effectiveStandardFromKeys.includes('status'),
      definition: false,
      fieldDefinitions: false,
    };

    return async ({ cursor = null, maxEntriesPerRun }) => {
      const { id: metaobjectDefinitionId } = Metaobject.decodeDynamicUrl(context.sync.dynamicUrl);
      const type =
        syncTableManager.prevContinuation?.extraContinuationData?.type ??
        (
          await fetchSingleMetaObjectDefinition({ gid: metaobjectDefinitionId }, context, {
            cacheTtlSecs: CACHE_DEFAULT,
          })
        ).type;

      syncTableManager.extraContinuationData = {
        type,
      };

      return this.all({
        context,
        type,
        fields,
        cursor,
        maxEntriesPerRun,
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
    maxEntriesPerRun = null,
    cursor = null,
    fields = {},
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Metaobject>> {
    let searchQuery = '';

    const response = await this.baseFind<Metaobject, typeof getMetaObjectsWithFieldsQuery>({
      documentNode: getMetaObjectsWithFieldsQuery,
      variables: {
        maxEntriesPerRun: maxEntriesPerRun ?? GRAPHQL_NODES_LIMIT,
        cursor,
        searchQuery,

        type: undefined, // will be set at executeSync()
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
            fieldDefinition.type.name as AllMetafieldTypeValue,
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
    const definition = await fetchSingleMetaObjectDefinition(
      { gid: metaObjectDefinitionId, includeFieldDefinitions: true },
      context,
      { cacheTtlSecs: CACHE_DEFAULT }
    );
    const fieldDefinitions = readFragmentArray(metaobjectFieldDefinitionFragment, definition.fieldDefinitions);
    const metaobjectFields = await this.formatMetaobjectFieldsFromRow(newRow, fieldDefinitions, context);
    // const metaobjectFields = await this.formatMetaobjectFieldsFromRow(newRow, fieldDefinitions, context);
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

  // public static async syncUpdate(
  //   codaSyncParams: coda.ParamValues<coda.ParamDefs>,
  //   updates: Array<coda.SyncUpdate<string, string, typeof this._schemaCache.items>>,
  //   context: coda.SyncExecutionContext
  // ): Promise<SyncTableUpdateResult> {
  //   const schema = await this.getArraySchema({ context, codaSyncParams });
  //   const { id: metaObjectDefinitionId } = this.decodeDynamicUrl(context.sync.dynamicUrl);
  //   const definition = await fetchSingleMetaObjectDefinition(
  //     { gid: metaObjectDefinitionId, includeFieldDefinitions: true },
  //     context,
  //     { cacheTtlSecs: CACHE_DEFAULT }
  //   );

  //   const completed = await Promise.allSettled(
  //     updates.map(async (update) => {
  //       const includedProperties = arrayUnique(
  //         update.updatedFields.concat(this.getRequiredPropertiesForUpdate(schema))
  //       );

  //       const prevRow = update.previousValue as MetaobjectRow;
  //       const newRow = Object.fromEntries(
  //         Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
  //       ) as MetaobjectRow;

  //       newRow._definitionCache = definition;

  //       return this.handleRowUpdate(prevRow, newRow, context);
  //     })
  //   );

  //   return {
  //     result: completed.map((job) => {
  //       if (job.status === 'fulfilled') return job.value;
  //       else return job.reason;
  //     }),
  //   };
  // }

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
         * creating/updating and typ is not needed for these mutations
         */
        type: undefined,
      });
    }
    return fields;
  }

  static async listDynamicSyncTableUrls(context) {
    const metaobjectDefinitions = await fetchAllMetaObjectDefinitions({}, context);
    return metaobjectDefinitions.length
      ? metaobjectDefinitions
          .map((definition) => ({
            display: definition.name,
            /** Use id instead of type as an identifier because
             * its easier to link back to the metaobject dynamic sync table while using {@link getMetaobjectReferenceSchema} */
            // value: definition.id,
            value: Metaobject.encodeDynamicUrl(definition),
          }))
          .sort(compareByDisplayKey)
      : [];
  }

  static async getDynamicSyncTableName(context: coda.SyncExecutionContext) {
    const { id } = Metaobject.decodeDynamicUrl(context.sync.dynamicUrl);
    const { type } = await fetchSingleMetaObjectDefinition({ gid: id }, context);
    return `${capitalizeFirstChar(type)} Metaobjects`;
  }

  static async getDynamicSyncTableDisplayUrl(context: coda.SyncExecutionContext) {
    const { id } = Metaobject.decodeDynamicUrl(context.sync.dynamicUrl);
    const { type } = await fetchSingleMetaObjectDefinition({ gid: id }, context);
    return `${context.endpoint}/admin/content/entries/${type}`;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  constructor(params: MetaobjectConstructorArgs) {
    super(params);
  }

  // public async activate(): Promise<void> {
  //   const documentNode = activateMetaobjectMutation;
  //   const variables = {
  //     locationId: this.graphQlGid,
  //   } as VariablesOf<typeof documentNode>;

  //   const response = await this.request<typeof documentNode>({
  //     context: this.context,
  //     documentNode: documentNode,
  //     variables: variables,
  //   });

  //   if (response.body.data.locationActivate?.location) {
  //     this.apiData = { ...this.apiData, ...response.body.data.locationActivate.location };
  //   }
  // }

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
    console.log('input', input);

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
      id: row.id ? idToGraphQlGid(GraphQlResourceName.Metaobject, row.id) : undefined,
      fields: metaobjectFields,
      type: row.type,

      handle: isNullOrEmpty(row.handle) ? undefined : row.handle,
      capabilities: isNullOrEmpty(row.status) ? undefined : { publishable: { status: row.status as MetaobjectStatus } },
    };

    console.log('apiData', apiData);
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