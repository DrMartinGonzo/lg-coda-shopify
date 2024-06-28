// #region Imports

import { ListTranslationsArgs } from '../../Clients/GraphQlClients';
import { Sync_Translations } from '../../coda/setup/translations-setup';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { TranslationModel } from '../../models/graphql/TranslationModel';
import { TranslationRow } from '../../schemas/CodaRows.types';
import { FieldDependency } from '../../schemas/Schema.types';
import { TranslationSyncTableSchema } from '../../schemas/syncTable/TranslationSchema';
import { parseOptionId } from '../../utils/helpers';
import { CodaSyncParams, GetSchemaArgs } from '../AbstractSyncedResources';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

// #region Types
export type SyncTranslationsParams = CodaSyncParams<typeof Sync_Translations>;
// #endregion

export class SyncedTranslations extends AbstractSyncedGraphQlResources<TranslationModel> {
  public static schemaDependencies: FieldDependency<typeof TranslationSyncTableSchema.properties>[] = [
    {
      field: 'market',
      dependencies: ['marketId'],
    },
  ];

  public static staticSchema = TranslationSyncTableSchema;

  public static async getDynamicSchema(args: GetSchemaArgs) {
    return this.staticSchema;
    // const [, resourceType] = codaSyncParams as CodaSyncParams<typeof Sync_Translations>;

    // let augmentedSchema = deepCopy(TranslationSyncTableSchema);
    // try {
    //   const supportedTranslatableOwner = new SupportedTranslatableOwner(resourceType as TranslatableResourceType);
    //   const { ownerReference } = supportedTranslatableOwner;
    //   console.log('ownerReference', ownerReference);
    //   if (ownerReference !== undefined) {
    //     augmentedSchema.properties['owner'] = {
    //       ...ownerReference,
    //       fromKey: 'owner',
    //       fixedId: 'owner',
    //       required: true,
    //       description: 'A relation to the resource that this translation belongs to.',
    //     };
    //     // @ts-expect-error
    //     augmentedSchema.featuredProperties.push('owner');
    //   }
    // } catch (error) {}

    // return augmentedSchema;
  }

  public get codaParamsMap() {
    const [locale, resourceType, marketId, onlyTranslated, keys] = this.codaParams as SyncTranslationsParams;
    return {
      locale,
      resourceType,
      marketId: idToGraphQlGid(GraphQlResourceNames.Market, parseOptionId(marketId)),
      onlyTranslated,
      keys,
    };
  }

  protected codaParamsToListArgs() {
    const { locale, resourceType, marketId, onlyTranslated, keys } = this.codaParamsMap;
    const fields = Object.fromEntries(
      ['market', 'marketId'].map((key) => [key, this.syncedStandardFields.includes(key)])
    );
    return {
      locale,
      resourceType,
      fields,
      marketId,
      onlyTranslated,
      keys,
    } as ListTranslationsArgs;
  }

  protected async createInstanceFromRow(row: TranslationRow) {
    const { locale, marketId } = this.codaParamsMap;
    const instance = await super.createInstanceFromRow(row);
    instance.data.locale = locale;
    instance.data.marketId = marketId;

    return instance;
  }
}
