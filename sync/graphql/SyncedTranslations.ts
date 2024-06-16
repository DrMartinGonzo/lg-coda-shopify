// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ListTranslationsArgs } from '../../Clients/GraphQlClients';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_Translations } from '../../coda/setup/translations-setup';
import { TranslationModel } from '../../models/graphql/TranslationModel';
import { TranslationSyncTableSchema } from '../../schemas/syncTable/TranslationSchema';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

// #endregion

export class SyncedTranslations extends AbstractSyncedGraphQlResources<TranslationModel> {
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
    const [locale, resourceType] = this.codaParams as CodaSyncParams<typeof Sync_Translations>;
    return { locale, resourceType };
  }

  protected codaParamsToListArgs() {
    const { locale, resourceType } = this.codaParamsMap;
    return {
      locale,
      resourceType,
    } as ListTranslationsArgs;
  }

  /**
   * {@link TranslationModel} has some additional required properties :
   * - locale
   */
  protected getAdditionalRequiredKeysForUpdate(update: coda.SyncUpdate<string, string, any>) {
    const additionalKeys = ['locale'];
    return [...super.getAdditionalRequiredKeysForUpdate(update), ...additionalKeys];
  }
}
