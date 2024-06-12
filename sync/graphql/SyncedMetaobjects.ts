// #region Imports
import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';
import * as PROPS from '../../coda/coda-properties';
import { readFragment, readFragmentArray } from '../../utils/tada-utils';

import {
  ListMetaobjectsArgs,
  MetaobjectDefinitionClient,
  MetaobjectFieldsArgs,
} from '../../Clients/GraphQlApiClientBase';
import { ShopClient } from '../../Clients/RestApiClientBase';
import { GetSchemaArgs } from '../../Resources/Abstract/AbstractResource';
import { METAFIELD_TYPES, MetafieldType } from '../../Resources/Mixed/METAFIELD_TYPES';
import { GraphQlResourceNames } from '../../Resources/types/SupportedResource';
import { CACHE_DISABLED, OPTIONS_METAOBJECT_STATUS, optionValues } from '../../constants';
import { metaobjectFieldDefinitionFragment } from '../../graphql/metaobjectDefinition-graphql';
import { MetaobjectDefinitionApiData } from '../../models/graphql/MetaobjectDefinitionModel';
import { MetaobjectFieldApiData, MetaobjectModel } from '../../models/graphql/MetaobjectModel';
import { MetaobjectRow } from '../../schemas/CodaRows.types';
import { mapMetaFieldToSchemaProperty } from '../../schemas/schema-utils';
import { MetaObjectSyncTableBaseSchema } from '../../schemas/syncTable/MetaObjectSchema';
import { CurrencyCode } from '../../types/admin.types';
import { graphQlGidToId, idToGraphQlGid } from '../../utils/conversion-utils';
import { deepCopy } from '../../utils/helpers';
import { formatMetafieldValueForApi } from '../../utils/metafields-utils';
import { requireMatchingMetaobjectFieldDefinition } from '../../utils/metaobjects-utils';
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

  public get codaParamsMap() {
    return {};
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
