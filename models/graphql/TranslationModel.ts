// #region Imports
import * as coda from '@codahq/packs-sdk';
import toConstantCase from 'to-constant-case';
import toPascalCase from 'to-pascal-case';

import { TranslationClient } from '../../Clients/GraphQlClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { graphQlGidToId, graphQlGidToResourceName, idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { TranslationRow } from '../../schemas/CodaRows.types';
import { LocalizableContentType, TranslatableResourceType } from '../../types/admin.types';
import { isNullishOrEmpty, safeToString } from '../../utils/helpers';
import { ModelWithDeletedFlag } from '../AbstractModel';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';
import { TranslatableContentApiData } from './TranslatableContentModel';

// #endregion

// #region Types
export interface TranslationApiData extends BaseApiDataGraphQl {
  value: string;
  key: string;
  outdated: boolean;
  updatedAt: string;
}

export interface RegisterTranslationApiData extends TranslationApiData {
  locale: string;
}

export interface TranslatableResourceApiData extends BaseApiDataGraphQl {
  resourceId: string;
  translatableContent: TranslatableContentApiData[];
  translations: TranslationApiData[];
}

export interface TranslationModelData
  extends Pick<TranslationApiData, 'key' | 'outdated' | 'updatedAt'>,
    Pick<TranslatableContentApiData, 'digest' | 'type' | 'locale'>,
    BaseModelDataGraphQl,
    ModelWithDeletedFlag {
  resourceGid: string;
  originalValue: string;
  translatedValue: string;
}
// #endregion

export class TranslationModel extends AbstractModelGraphQl {
  public data: TranslationModelData;

  protected readonly primaryKey = 'fullId';
  public static readonly DELETED_SUFFIX = '&deleted=1';
  public static readonly displayName: Identity = PACK_IDENTITIES.Translation;
  protected static readonly graphQlName = GraphQlResourceNames.Translation;

  public static createInstanceFromRow(context: coda.ExecutionContext, { id, resourceType, ...row }: TranslationRow) {
    const isDeletedFlag = id.includes(TranslationModel.DELETED_SUFFIX);
    const resourceGid = TranslationModel.extractResourceGidFromFullId(id);

    let data: Partial<TranslationModelData> = {
      ...row,
      key: TranslationModel.extractKeyFromFullId(id),
      locale: TranslationModel.extractLocaleFromFullId(id),
      resourceGid,
      updatedAt: safeToString(row.updated_at),
      isDeletedFlag: isDeletedFlag ?? false,
    };

    return TranslationModel.createInstance(context, data);
  }

  public static translatableResourceTypeToGid(translatableResourceType: TranslatableResourceType, resourceId: number) {
    return idToGraphQlGid(toPascalCase(translatableResourceType), resourceId);
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
  // public static parseFullId(fullId: string) {
  //   return {
  //     resourceGid: TranslationModel.extractResourceGidFromFullId(fullId),
  //     key: TranslationModel.extractKeyFromFullId(fullId),
  //     locale: TranslationModel.extractLocaleFromFullId(fullId),
  //   };
  // }

  /*
  protected static getOwnerInfo(resourceType: TranslatableResourceType, key: string) {
    switch (resourceType) {
      case TranslatableResourceType.Collection:
        return {
          urlPart: 'collection',
        };
      case TranslatableResourceType.Product:
        return {
          urlPart: 'products',
        };
      case TranslatableResourceType.OnlineStoreArticle:
        return {
          urlPart: 'online_store_article',
        };
      case TranslatableResourceType.OnlineStoreBlog:
        return {
          urlPart: 'online_store_blog',
        };
      case TranslatableResourceType.Filter:
        return {
          urlPart: 'online_store_filter_setting',
        };
      case TranslatableResourceType.Metaobject:
        return {
          urlPart: 'metaobject',
        };
      case TranslatableResourceType.OnlineStoreMenu:
        return {
          urlPart: 'online_store_menu',
        };
      case TranslatableResourceType.OnlineStorePage:
        return {
          urlPart: 'online_store_page',
        };
      case TranslatableResourceType.ShopPolicy:
        return {
          urlPart: 'shop_policy',
        };
      case TranslatableResourceType.Shop:
        return {
          urlPart: 'shop',
        };
      case TranslatableResourceType.OnlineStoreTheme:
        if (key.startsWith('section.')) {
          // Modele
          // section.article.legacy.json.blog-posts.title:2xqsnl1cqew9d

          // section.page.contact-pro.json.a27eeb53-c0e4-4f63-84fd-0152275335d1.title:1vky1xb1e9sgu

          if (key.indexOf('.json') !== -1) {
            return {
              urlPart: 'online_store_theme_section_group',
            };
          } else {
            return {
              urlPart: 'online_store_theme_settings_data_sections',
            };
          }
        } else {
          return {
            urlPart: 'online_store_theme_locale_content',
          };
        }

        return {
          urlPart: 'online_store_theme_app_embed',
        };

      default:
        break;
    }
  }
  */

  /*
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
  */

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return TranslationClient.createInstance(this.context);
  }

  get fullId() {
    if (this.data.resourceGid && this.data.key && this.data.locale) {
      let fullId = `${this.data.resourceGid}?key=${this.data.key}&locale=${this.data.locale}`;
      if (this.data.isDeletedFlag) {
        fullId += TranslationModel.DELETED_SUFFIX;
      }
      return fullId;
    }
    throw new Error('unable to get fullId');
  }

  public async save(): Promise<void> {
    const isUpdate = !!this.fullId;
    if (isUpdate) {
      let newData: Partial<TranslationModelData>;

      if (isNullishOrEmpty(this.data.translatedValue)) {
        await this.client.delete(this.data);
        newData = {
          ...this.data,
          isDeletedFlag: true,
          digest: undefined,
          outdated: undefined,
          updatedAt: undefined,
          translatedValue: undefined,
        };
      } else {
        // get up to date digest
        this.data.digest = await this.client.digest(this.data);
        const response = await this.client.register(this.data);
        newData = response.body;
      }

      if (newData) {
        this.setData(newData);
      }
    }
  }

  public toCodaRow(): TranslationRow {
    const { fullId } = this;
    const { resourceGid, ...data } = this.data;

    let obj: Partial<TranslationRow> = {
      ...data,
    };

    if (fullId) {
      obj.id = fullId;
      obj.resourceId = graphQlGidToId(resourceGid);
      obj.resourceType = toConstantCase(graphQlGidToResourceName(resourceGid));
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
