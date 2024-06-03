// #region Imports
import toConstantCase from 'to-constant-case';
import toPascalCase from 'to-pascal-case';
import { VariablesOf } from '../../utils/tada-utils';

import { SyncTableManagerGraphQl } from '../../SyncTableManager/GraphQl/SyncTableManagerGraphQl';
import { MakeSyncFunctionArgs, SyncGraphQlFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Translations } from '../../coda/setup/translations-setup';
import { CACHE_DEFAULT, CACHE_DISABLED, GRAPHQL_NODES_LIMIT, Identity, PACK_IDENTITIES } from '../../constants';
import {
  getSingleTranslationQuery,
  getTranslationsQuery,
  registerTranslationMutation,
  removeTranslationsMutation,
} from '../../graphql/translations-graphql';
import { TranslationRow } from '../../schemas/CodaRows.types';
import { TranslationSyncTableSchema } from '../../schemas/syncTable/TranslationSchema';
import { LocalizableContentType, TranslatableResourceType } from '../../types/admin.types';
import { graphQlGidToId, graphQlGidToResourceName, idToGraphQlGid } from '../../utils/conversion-utils';
import { isNullishOrEmpty } from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import {
  AbstractGraphQlResource,
  FindAllGraphQlResponse,
  GraphQlResourcePath,
  SaveArgs,
} from '../Abstract/GraphQl/AbstractGraphQlResource';
import { BaseContext, FromRow } from '../types/Resource.types';
import { GraphQlResourceNames } from '../types/SupportedResource';

// #endregion

const DELETED_SUFFIX = '&deleted=1';

// #region Types
interface FieldsArgs {
  metafields?: boolean;
  fulfillment_service?: boolean;
  local_pickup_settings?: boolean;
}
interface FindArgs extends BaseContext {
  resourceGid: string;
  locale: string;
  key: string;
  fields?: FieldsArgs;
}
interface DeleteArgs extends BaseContext {
  resourceGid: string;
  translationKeys: string[];
  locales: string[];
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  limit?: number;
  cursor?: string;
  locale: string;
  resourceType: string;
}
// #endregion

export class Translation extends AbstractGraphQlResource {
  public apiData: {
    resourceGid: string;
    digest: string;
    type: LocalizableContentType;
    originalValue: string;
    locale: string;
    translatedValue: string;
    key: string;
    outdated: boolean;
    updatedAt: string;
  } & {
    /** un flag special pour savoir si une translatoon a deja été suppriméz, utile
     * dans le cas du'une sync table, où l'on peut supprimer une
     * translation mais où celle-ci reste visible jusqu'a la prochaine synchronisation.
     * Ça va nous servir à formatter le id avec [deleted] à la fin */
    isDeletedFlag: boolean;
  };

  public static readonly displayName: Identity = PACK_IDENTITIES.Translation;
  protected static readonly graphQlName = GraphQlResourceNames.Translation;

  protected static readonly paths: Array<GraphQlResourcePath> = [
    'node',
    'location',
    'locations',
    'translationsRegister.translations',
  ];

  // protected static getOwnerInfo(resourceType: TranslatableResourceType, key: string) {
  //   switch (resourceType) {
  //     case TranslatableResourceType.Collection:
  //       return {
  //         urlPart: 'collection',
  //       };
  //     case TranslatableResourceType.Product:
  //       return {
  //         urlPart: 'products',
  //       };
  //     case TranslatableResourceType.OnlineStoreArticle:
  //       return {
  //         urlPart: 'online_store_article',
  //       };
  //     case TranslatableResourceType.OnlineStoreBlog:
  //       return {
  //         urlPart: 'online_store_blog',
  //       };
  //     case TranslatableResourceType.Filter:
  //       return {
  //         urlPart: 'online_store_filter_setting',
  //       };
  //     case TranslatableResourceType.Metaobject:
  //       return {
  //         urlPart: 'metaobject',
  //       };
  //     case TranslatableResourceType.OnlineStoreMenu:
  //       return {
  //         urlPart: 'online_store_menu',
  //       };
  //     case TranslatableResourceType.OnlineStorePage:
  //       return {
  //         urlPart: 'online_store_page',
  //       };
  //     case TranslatableResourceType.ShopPolicy:
  //       return {
  //         urlPart: 'shop_policy',
  //       };
  //     case TranslatableResourceType.Shop:
  //       return {
  //         urlPart: 'shop',
  //       };
  //     case TranslatableResourceType.OnlineStoreTheme:
  //       if (key.startsWith('section.')) {
  //         // Modele
  //         // section.article.legacy.json.blog-posts.title:2xqsnl1cqew9d

  //         // section.page.contact-pro.json.a27eeb53-c0e4-4f63-84fd-0152275335d1.title:1vky1xb1e9sgu

  //         if (key.indexOf('.json') !== -1) {
  //           return {
  //             urlPart: 'online_store_theme_section_group',
  //           };
  //         } else {
  //           return {
  //             urlPart: 'online_store_theme_settings_data_sections',
  //           };
  //         }
  //       } else {
  //         return {
  //           urlPart: 'online_store_theme_locale_content',
  //         };
  //       }

  //       return {
  //         urlPart: 'online_store_theme_app_embed',
  //       };

  //     default:
  //       break;
  //   }
  // }

  protected static getOwnerInfo(graphQlResourceName: string): TranslatableResourceType {
    switch (graphQlResourceName) {
      case GraphQlResourceNames.Collection:
        return TranslatableResourceType.Collection;
      case 'DeliveryMethodDefinition':
        return TranslatableResourceType.DeliveryMethodDefinition;
      case 'EmailTemplate':
        return TranslatableResourceType.EmailTemplate;
      case 'OnlineStoreFilterSetting':
        return TranslatableResourceType.Filter;

      case 'Link':
        return TranslatableResourceType.Link;
      case GraphQlResourceNames.Metafield:
        return TranslatableResourceType.Metafield;
      case GraphQlResourceNames.Metaobject:
        return TranslatableResourceType.Metaobject;
      case GraphQlResourceNames.Article:
        return TranslatableResourceType.OnlineStoreArticle;
      case GraphQlResourceNames.Blog:
        return TranslatableResourceType.OnlineStoreBlog;
      case 'OnlineStoreMenu':
        return TranslatableResourceType.OnlineStoreMenu;
      case GraphQlResourceNames.Page:
        return TranslatableResourceType.OnlineStorePage;
      case 'OnlineStoreTheme':
        return TranslatableResourceType.OnlineStoreTheme;
      case 'PackingSlipTemplate':
        return TranslatableResourceType.PackingSlipTemplate;
      // case 'PaymentGateway':
      //   return TranslatableResourceType.PaymentGateway;
      case 'PaymentGateway':
        return TranslatableResourceType.PaymentGateway;
      case 'Product':
        return TranslatableResourceType.Product;
      case 'ProductOption':
        return TranslatableResourceType.ProductOption;
      case 'ProductOptionValue':
        return TranslatableResourceType.ProductOptionValue;
      case 'SellingPlan':
        return TranslatableResourceType.SellingPlan;
      case 'SellingPlanGroup':
        return TranslatableResourceType.SellingPlanGroup;
      case GraphQlResourceNames.Shop:
        return TranslatableResourceType.Shop;
      case 'ShopPolicy':
        return TranslatableResourceType.ShopPolicy;

      default:
        break;
    }
  }

  public static getStaticSchema() {
    return TranslationSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    return TranslationSyncTableSchema;
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

  public static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
  }: MakeSyncFunctionArgs<
    typeof Sync_Translations,
    SyncTableManagerGraphQl<Translation>
  >): SyncGraphQlFunction<Translation> {
    const [locale, resourceType] = codaSyncParams;

    return ({ cursor = null, limit }) =>
      this.all({
        context,
        cursor,
        limit,
        options: { cacheTtlSecs: CACHE_DISABLED },
        locale,
        resourceType,
      });
  }

  public static async find({ resourceGid, locale, key, context, options }: FindArgs): Promise<Translation | null> {
    const response = await this.request({
      context,
      options: {
        ...options,
        cacheTtlSecs: options?.cacheTtlSecs ?? CACHE_DEFAULT,
      },
      documentNode: getSingleTranslationQuery,
      variables: {
        id: resourceGid,
        locale,
      } as VariablesOf<typeof getSingleTranslationQuery>,
    });

    const node = response.body.data.translatableResource;
    const matchingTranslatableContent = node.translatableContent.find((c) => c.key === key);
    const matchingTranslation = node.translations.find((t) => t.key === key);

    const data: Partial<Translation['apiData']> = {
      resourceGid: node.resourceId,
      locale,
      digest: matchingTranslatableContent?.digest,
      originalValue: matchingTranslatableContent?.value,
      type: matchingTranslatableContent?.type as LocalizableContentType,
      isDeletedFlag: true,
    };
    if (matchingTranslation) {
      data.key = matchingTranslation.key;
      data.translatedValue = matchingTranslation.value;
      data.outdated = matchingTranslation.outdated;
      data.isDeletedFlag = false;
      data.updatedAt = matchingTranslation?.updatedAt;
    }

    return this.createInstance(context, data) as Translation;
  }

  public static async delete({ resourceGid, translationKeys, locales, context, options }: DeleteArgs) {
    return this.baseDelete<typeof removeTranslationsMutation>({
      documentNode: removeTranslationsMutation,
      variables: {
        resourceId: resourceGid,
        locales,
        translationKeys,
      },
      context,
      options,
    });
  }

  public static async all({
    context,
    limit = null,
    cursor = null,
    locale,
    resourceType,
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllGraphQlResponse<Translation>> {
    const response = await this.request({
      context,
      options: {
        ...options,
        cacheTtlSecs: options?.cacheTtlSecs ?? CACHE_DEFAULT,
      },
      documentNode: getTranslationsQuery,
      variables: {
        limit: limit ?? GRAPHQL_NODES_LIMIT,
        cursor,
        locale,
        resourceType,
        ...otherArgs,
      } as VariablesOf<typeof getTranslationsQuery>,
    });

    let data: Translation['apiData'][] = [];
    if (response?.body?.data?.translatableResources?.nodes) {
      data = response.body.data.translatableResources.nodes.flatMap((node) => {
        return node.translations.map((t) => {
          const matchingTranslatableContent = node.translatableContent.find((c) => c.key === t.key);
          return {
            resourceGid: node.resourceId,
            locale: locale,
            key: t.key,
            translatedValue: t.value,
            digest: matchingTranslatableContent?.digest,
            originalValue: matchingTranslatableContent?.value,
            outdated: t.outdated,
            type: matchingTranslatableContent?.type,
            updatedAt: t.updatedAt,
          } as Translation['apiData'];
        });
      });
    }

    return {
      data: data.map((d) => this.createInstance(context, d)),
      headers: response.headers,
      pageInfo: response.pageInfo,
      cost: response.cost,
    };
  }

  public static translatableResourceTypeToGid(translatableResourceType: TranslatableResourceType, resourceId: number) {
    return idToGraphQlGid(toPascalCase(translatableResourceType), resourceId);
  }
  public static generateFullId(resourceGid: string, key: string, locale: string) {
    return `${resourceGid}?key=${key}&locale=${locale}`;
  }
  private static extractResourceGidFromFullId(fullId: string) {
    return fullId.split('?')[0];
  }
  private static extractKeyFromFullId(fullId: string) {
    return fullId.split('key=')[1].split('&')[0];
  }
  private static extractLocaleFromFullId(fullId: string) {
    return fullId.split('locale=')[1].split('&')[0];
  }
  public static parseFullId(fullId: string) {
    return {
      resourceGid: Translation.extractResourceGidFromFullId(fullId),
      key: Translation.extractKeyFromFullId(fullId),
      locale: Translation.extractLocaleFromFullId(fullId),
    };
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get fullId() {
    if (this.apiData.resourceGid && this.apiData.key && this.apiData.locale) {
      return Translation.generateFullId(this.apiData.resourceGid, this.apiData.key, this.apiData.locale);
    }
  }

  protected async getFullFreshData() {
    const res = await Translation.find({
      context: this.context,
      locale: this.apiData.locale,
      key: this.apiData.key,
      resourceGid: this.apiData.resourceGid,
      options: {
        cacheTtlSecs: CACHE_DISABLED,
      },
    });
    return res.apiData;
  }

  protected async getCurrentDigest(): Promise<string> {
    const freshData = await this.getFullFreshData();
    return freshData.digest;
  }

  /**
   * {@link Translation} has some additional required properties :
   * - locale
   */
  // public static getRequiredPropertiesForUpdate(
  //   schema: coda.ArraySchema<coda.ObjectSchema<string, string>>,
  //   updatedFields: string[] = []
  // ) {
  //   return super.getRequiredPropertiesForUpdate(schema, updatedFields).concat(['locale']);
  // }

  public async save({ update = false }: SaveArgs): Promise<void> {
    let newData: Partial<Translation['apiData']>;

    if (isNullishOrEmpty(this.apiData.translatedValue)) {
      await Translation.delete({
        context: this.context,
        locales: [this.apiData.locale],
        resourceGid: this.apiData.resourceGid,
        translationKeys: [this.apiData.key],
      });

      newData = {
        isDeletedFlag: true,
        key: this.apiData.key,
        locale: this.apiData.locale,
        originalValue: this.apiData.originalValue,
        resourceGid: this.apiData.resourceGid,
        type: this.apiData.type,
        digest: undefined,
        outdated: undefined,
        updatedAt: undefined,
        translatedValue: undefined,
      };
    } else {
      const digest = await this.getCurrentDigest();
      this.apiData.digest = digest;

      const documentNode = registerTranslationMutation;
      const variables = {
        resourceId: this.apiData.resourceGid,
        translations: [
          {
            key: this.apiData.key,
            value: this.apiData.translatedValue,
            translatableContentDigest: this.apiData.digest,
            locale: this.apiData.locale,
          },
        ],
      } as VariablesOf<typeof documentNode>;
      const response = await this.request<typeof documentNode>({
        context: this.context,
        documentNode: documentNode,
        variables: variables,
      });

      const matchingTranslation = response.body.data.translationsRegister.translations.find(
        (t) => t.key === this.apiData.key && t.locale === this.apiData.locale
      );

      newData = {
        isDeletedFlag: false,
        originalValue: this.apiData.originalValue,
        resourceGid: this.apiData.resourceGid,
        type: this.apiData.type,
        digest,
        key: this.apiData.key,
        locale: this.apiData.locale,
        outdated: matchingTranslation.outdated,
        updatedAt: matchingTranslation.updatedAt,
        translatedValue: matchingTranslation.value,
      };
    }

    if (update && newData) {
      this.setData(newData);
    }
  }

  protected formatToApi({ row, metafields }: FromRow<TranslationRow>) {
    const isDeletedFlag = row.id.includes(DELETED_SUFFIX);
    const resourceGid = Translation.extractResourceGidFromFullId(row.id);
    let apiData: Partial<typeof this.apiData> = {
      key: Translation.extractKeyFromFullId(row.id),
      locale: Translation.extractLocaleFromFullId(row.id),
      originalValue: row.originalValue,
      outdated: row.outdated,
      resourceGid,
      type: row.type as LocalizableContentType,
      translatedValue: row.translatedValue,
      updatedAt: row.updated_at ? row.updated_at.toString() : undefined,
      isDeletedFlag: isDeletedFlag ?? false,
    };
    return apiData;
  }
  public formatToRow(): TranslationRow {
    const { apiData: data } = this;
    const fullId = this.fullId;

    // only those value are always present
    let obj: Partial<TranslationRow> = {
      key: data.key,
      locale: data.locale,
      outdated: data.outdated,
      updated_at: data.updatedAt,
      translatedValue: data.translatedValue,
    };

    if (fullId) {
      obj.id = fullId + (data.isDeletedFlag ? DELETED_SUFFIX : '');
      obj.resourceId = graphQlGidToId(data.resourceGid);
      obj.resourceType = toConstantCase(graphQlGidToResourceName(data.resourceGid));
    }
    if (data.originalValue) {
      obj.originalValue = data.originalValue;
    }
    // if (data.resourceType) {
    //   obj.resourceType = data.resourceType;

    //   try {
    //     const supportedTranslatableResourceType = new SupportedTranslatableOwner(data.resourceType);
    //     const { formatOwnerReference } = supportedTranslatableResourceType;
    //     if (formatOwnerReference && obj.resourceId) {
    //       obj.owner = formatOwnerReference(obj.resourceId);
    //     }
    //   } catch (error) {}
    // }
    if (data.type) {
      obj.type = data.type;
    }

    // if (data.resourceType && data.resourceGid) {
    //   obj.admin_url = `${
    //     this.context.endpoint
    //   }/admin/apps/translate-and-adapt/localize/${data.resourceType.toLowerCase()}?id=${graphQlGidToId(
    //     data.resourceGid
    //   )}&shopLocale=${data.locale}`;
    // }

    return obj as TranslationRow;
  }
}
