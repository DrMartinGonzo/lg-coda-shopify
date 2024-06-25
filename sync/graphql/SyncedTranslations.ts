// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ListTranslationsArgs } from '../../Clients/GraphQlClients';
import { Sync_Translations } from '../../coda/setup/translations-setup';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { TranslationModel } from '../../models/graphql/TranslationModel';
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
    const [locale, resourceType, marketId] = this.codaParams as SyncTranslationsParams;
    return {
      locale,
      resourceType,
      marketId: idToGraphQlGid(GraphQlResourceNames.Market, parseOptionId(marketId)),
    };
  }

  protected codaParamsToListArgs() {
    const { locale, resourceType, marketId } = this.codaParamsMap;
    const fields = Object.fromEntries(
      ['market', 'marketId'].map((key) => [key, this.syncedStandardFields.includes(key)])
    );
    return {
      locale,
      resourceType,
      fields,
      marketId,
    } as ListTranslationsArgs;
  }

  /**
   * {@link TranslationModel} has some additional required properties :
   * - locale
   */
  protected getAdditionalRequiredKeysForUpdate(update: coda.SyncUpdate<string, string, any>) {
    const additionalKeys = ['locale', 'market', 'marketId'];
    return [...super.getAdditionalRequiredKeysForUpdate(update), ...additionalKeys];
  }
}
