// #region Imports
import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import * as PROPS from '../../coda/utils/coda-properties';
import { graphQlGidToId, idToGraphQlGid, readFragment, readFragmentArray } from '../../graphql/utils/graphql-utils';

import { ListMetaobjectsArgs, MetaobjectDefinitionClient, MetaobjectFieldsArgs } from '../../Clients/GraphQlClients';
import { ShopClient } from '../../Clients/RestClients';
import { CACHE_DISABLED, OPTIONS_METAOBJECT_STATUS, optionValues } from '../../constants';
import { metaobjectFieldDefinitionFragment } from '../../graphql/metaobjectDefinition-graphql';
import { MetaobjectDefinitionApiData } from '../../models/graphql/MetaobjectDefinitionModel';
import { MetaobjectFieldApiData, MetaobjectModel } from '../../models/graphql/MetaobjectModel';
import { METAFIELD_TYPES, MetafieldType } from '../../models/types/METAFIELD_TYPES';
import { GraphQlResourceNames } from '../../models/types/SupportedResource';
import { formatMetafieldValueForApi } from '../../models/utils/MetafieldHelper';
import { requireMatchingMetaobjectFieldDefinition } from '../../models/utils/metaobjects-utils';
import { MetaobjectRow } from '../../schemas/CodaRows.types';
import { getObjectSchemaRowKeys, mapMetaFieldToSchemaProperty } from '../../schemas/schema-utils';
import { MetaObjectSyncTableBaseSchema } from '../../schemas/syncTable/MetaObjectSchema';
import { CurrencyCode } from '../../types/admin.types';
import { deepCopy } from '../../utils/helpers';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

export class SyncedMetaobjects extends AbstractSyncedGraphQlResources<MetaobjectModel> {
  private currentType: string;
  public static staticSchema = MetaObjectSyncTableBaseSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const { id: metaobjectDefinitionId } = SyncedMetaobjects.decodeDynamicUrl(context.sync.dynamicUrl);
    const metaobjectDefinition = await MetaobjectDefinitionClient.createInstance(context).single({
      id: metaobjectDefinitionId,
      fields: {
        fieldDefinitions: true,
        capabilities: true,
      },
      options: { cacheTtlSecs: CACHE_DISABLED },
    });
    const { displayNameKey, capabilities } = metaobjectDefinition.body;
    const fieldDefinitions = readFragment(
      metaobjectFieldDefinitionFragment,
      metaobjectDefinition.body.fieldDefinitions
    );
    const isPublishable = capabilities?.publishable?.enabled;
    let defaultDisplayProperty = 'handle';

    let augmentedSchema = deepCopy(this.staticSchema);

    if (isPublishable) {
      augmentedSchema.properties['status'] = {
        ...PROPS.SELECT_LIST,
        fixedId: 'status',
        description: `The status of the metaobject`,
        mutable: true,
        options: optionValues(OPTIONS_METAOBJECT_STATUS),
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
          // @ts-expect-error
          augmentedSchema.displayProperty = name;
          augmentedSchema.properties[name].required = true;
          // @ts-expect-error
          augmentedSchema.featuredProperties[augmentedSchema.featuredProperties.indexOf(defaultDisplayProperty)] = name;
        }
      }
    });

    // @ts-expect-error: admin_url should always be the last featured property, regardless of any custom field keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public static encodeDynamicUrl(metaobjectDefinition: MetaobjectDefinitionApiData): string {
    return graphQlGidToId(metaobjectDefinition.id).toString();
  }

  public static decodeDynamicUrl(dynamicUrl: string) {
    return {
      id: idToGraphQlGid(GraphQlResourceNames.MetaobjectDefinition, parseInt(dynamicUrl, 10)),
    };
  }

  private static getCustomFieldsKeysFromRow(row: MetaobjectRow) {
    /** Any key that is not in the static base schema is a custom filed key */
    const rowKeys = getObjectSchemaRowKeys(this.staticSchema);
    return Object.keys(row).filter((key) => !rowKeys.includes(key));
  }

  public get codaParamsMap() {
    return {};
  }

  private async getMetaobjectDefinition() {
    const { id: metaObjectDefinitionId } = SyncedMetaobjects.decodeDynamicUrl(this.context.sync.dynamicUrl);
    const response = await MetaobjectDefinitionClient.createInstance(this.context).single({
      id: metaObjectDefinitionId,
      fields: { fieldDefinitions: true },
    });
    return response?.body;
  }

  private async getMetaobjectFieldDefinitions() {
    const metaobjectDefinition = await this.getMetaobjectDefinition();
    return readFragmentArray(metaobjectFieldDefinitionFragment, metaobjectDefinition?.fieldDefinitions);
  }

  private async formatRowCustomFields(row: MetaobjectRow, customFieldskeys: string[]) {
    let currencyCode: CurrencyCode;
    const fieldDefinitions = await this.getMetaobjectFieldDefinitions();

    return Promise.all(
      customFieldskeys.map(async (key): Promise<MetaobjectFieldApiData> => {
        const fieldDefinition = requireMatchingMetaobjectFieldDefinition(key, fieldDefinitions);

        // Get current Shop currency if needed
        if (fieldDefinition.type.name === METAFIELD_TYPES.money && currencyCode === undefined) {
          currencyCode = await ShopClient.createInstance(this.context).activeCurrency();
        }

        let formattedValue: string;
        try {
          formattedValue = formatMetafieldValueForApi(
            row[key],
            fieldDefinition.type.name as MetafieldType,
            fieldDefinition.validations,
            currencyCode
          );
        } catch (error) {
          throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${key}.`);
        }

        return {
          key,
          value: formattedValue ?? '',
          type: fieldDefinition.type.name,
        };
      })
    );
  }

  protected async createInstanceFromRow(row: MetaobjectRow) {
    const instance = await super.createInstanceFromRow(row);
    const customFieldsKeys = SyncedMetaobjects.getCustomFieldsKeysFromRow(row);
    if (customFieldsKeys.length) {
      const customFields = await this.formatRowCustomFields(row, customFieldsKeys);
      instance.setCustomFields(customFields);
    }
    return instance;
  }

  protected async beforeSync(): Promise<void> {
    const { id: metaobjectDefinitionId } = SyncedMetaobjects.decodeDynamicUrl(this.context.sync.dynamicUrl);
    this.currentType =
      this.prevContinuation?.extraData?.type ??
      (await MetaobjectDefinitionClient.createInstance(this.context).single({ id: metaobjectDefinitionId }))?.body
        ?.type;
  }

  protected async afterSync(): Promise<void> {
    if (this.continuation) {
      this.continuation = {
        ...this.continuation,
        extraData: {
          ...(this.continuation.extraData ?? {}),
          type: this.currentType,
        },
      };
    }
  }

  protected codaParamsToListArgs() {
    const type = this.currentType;
    const fields: MetaobjectFieldsArgs = {
      capabilities: this.effectiveStandardFromKeys.includes('status'),
      definition: false,
      fieldDefinitions: false,
    };
    return { type, fields } as ListMetaobjectsArgs;
  }
}
