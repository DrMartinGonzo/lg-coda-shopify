import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';

import { SyncTableGraphQl } from '../../Fetchers/SyncTableGraphQl';
import { OPTIONS_METAOBJECT_STATUS } from '../../constants';
import { mapMetaFieldToSchemaProperty } from '../../schemas/schema-helpers';
import { MetaObjectSyncTableBaseSchema } from '../../schemas/syncTable/MetaObjectSchema';
import { VariablesOf, readFragment } from '../../utils/graphql';
import { capitalizeFirstChar, compareByDisplayKey, deepCopy } from '../../utils/helpers';
import { MetaobjectGraphQlFetcher } from './MetaobjectGraphQlFetcher';
import { Metaobject, metaobjectResource } from './metaobjectResource';
import { fetchAllMetaObjectDefinitions, fetchSingleMetaObjectDefinition } from './metaobjects-functions';
import { getMetaObjectsWithFieldsQuery, metaobjectFieldDefinitionFragment } from './metaobjects-graphql';

export class MetaobjectSyncTable extends SyncTableGraphQl<Metaobject> {
  type: string;

  constructor(fetcher: MetaobjectGraphQlFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(metaobjectResource, fetcher, params);
    // TODO: get an approximation for first run by using count of relation columns ?
    this.initalMaxEntriesPerRun = 50;
  }

  static async listDynamicUrls(context) {
    const metaobjectDefinitions = await fetchAllMetaObjectDefinitions({}, context);
    return metaobjectDefinitions.length
      ? metaobjectDefinitions
          .map((definition) => ({
            display: definition.name,
            /** Use id instead of type as an identifier because
             * its easier to link back to the metaobject dynamic sync table while using {@link getMetaobjectReferenceSchema} */
            value: definition.id,
          }))
          .sort(compareByDisplayKey)
      : [];
  }

  static async getName(context: coda.SyncExecutionContext) {
    const { type } = await fetchSingleMetaObjectDefinition({ gid: context.sync.dynamicUrl }, context);
    return `${capitalizeFirstChar(type)} Metaobjects`;
  }

  static async getDisplayUrl(context: coda.SyncExecutionContext) {
    const { type } = await fetchSingleMetaObjectDefinition({ gid: context.sync.dynamicUrl }, context);
    return `${context.endpoint}/admin/content/entries/${type}`;
  }

  static async getSchema(context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
    const metaobjectDefinition = await fetchSingleMetaObjectDefinition(
      { gid: context.sync.dynamicUrl, includeCapabilities: true, includeFieldDefinitions: true },
      context
    );
    const { displayNameKey } = metaobjectDefinition;
    const fieldDefinitions = readFragment(metaobjectFieldDefinitionFragment, metaobjectDefinition.fieldDefinitions);
    const isPublishable = metaobjectDefinition.capabilities?.publishable?.enabled;
    let defaultDisplayProperty = 'handle';

    let augmentedSchema = deepCopy(MetaObjectSyncTableBaseSchema);

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

  async executeSync(schema: any) {
    /**
     * We need to get the type ahead of the sync
     * This is a good place to do it because executeSync is already async.
     // TODO: maybe we should do it in beforeSync
     */
    const { type } =
      this.prevContinuation?.extraContinuationData ??
      (await fetchSingleMetaObjectDefinition({ gid: this.fetcher.context.sync.dynamicUrl }, this.fetcher.context));
    this.type = type;

    return super.executeSync(schema);
  }

  setPayload(): void {
    this.documentNode = getMetaObjectsWithFieldsQuery;
    this.variables = {
      type: this.type,
      maxEntriesPerRun: this.maxEntriesPerRun,
      includeCapabilities: this.effectivePropertyKeys.includes('status'),
      includeDefinition: false,
      includeFieldDefinitions: false,
      cursor: this.prevContinuation?.cursor ?? null,
    } as VariablesOf<typeof getMetaObjectsWithFieldsQuery>;
  }
}
