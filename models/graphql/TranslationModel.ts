// #region Imports
import * as coda from '@codahq/packs-sdk';
import toConstantCase from 'to-constant-case';
import toPascalCase from 'to-pascal-case';

import { TranslationClient } from '../../Clients/GraphQlClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { translatableContentFieldsFragment, translationFieldsFragment } from '../../graphql/translations-graphql';
import { ResultOf, graphQlGidToId, graphQlGidToResourceName, idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { TranslationRow } from '../../schemas/CodaRows.types';
import { formatMarketReference } from '../../schemas/syncTable/MarketSchema';
import { TranslatableResourceType } from '../../types/admin.types';
import { isNullishOrEmpty, safeToString } from '../../utils/helpers';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export interface TranslatableContentApiData extends ResultOf<typeof translatableContentFieldsFragment> {}

export interface TranslationApiData extends ResultOf<typeof translationFieldsFragment> {}

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
    BaseModelDataGraphQl {
  resourceGid: TranslatableResourceApiData['resourceId'];
  originalValue: TranslatableContentApiData['value'];
  translatedValue: TranslationApiData['value'];
  marketId: TranslationApiData['market']['id'];
}
// #endregion

export class TranslationModel extends AbstractModelGraphQl {
  public data: TranslationModelData;

  protected readonly primaryKey = 'fullId';
  public static readonly displayName: Identity = PACK_IDENTITIES.Translation;
  protected static readonly graphQlName = GraphQlResourceNames.Translation;

  public static createInstanceFromRow(
    context: coda.ExecutionContext,
    { id, type, resourceType, ...row }: TranslationRow
  ) {
    const { key, locale, marketId, resourceGid } = TranslationModel.parseFullId(id);

    let data: Partial<TranslationModelData> = {
      ...row,
      key,
      locale,
      resourceGid,
      type: type as TranslatableContentApiData['type'],
      updatedAt: safeToString(row.updated_at),
      marketId: idToGraphQlGid(GraphQlResourceNames.Market, row.market?.id ?? row.marketId) ?? marketId,
    };

    return TranslationModel.createInstance(context, data);
  }

  public static translatableResourceTypeToGid(translatableResourceType: TranslatableResourceType, resourceId: number) {
    return idToGraphQlGid(toPascalCase(translatableResourceType), resourceId);
  }
  public static parseFullId(fullId: string) {
    const { key, locale, marketId } = coda.getQueryParams(fullId) as {
      key: string;
      locale: string;
      marketId: string;
    };
    return {
      key,
      locale,
      marketId: idToGraphQlGid(GraphQlResourceNames.Market, marketId),
      resourceGid: TranslationModel.extractResourceGidFromFullId(fullId),
    };
  }
  private static extractResourceGidFromFullId(fullId: string) {
    return fullId.split('?')[0];
  }

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
    const { resourceGid, key, locale, marketId } = this.data;
    const hasRequiredKeys = resourceGid && key && locale;
    if (hasRequiredKeys) {
      const params: { [key: string]: any } = {
        key,
        locale,
        marketId: graphQlGidToId(marketId),
      };
      return coda.withQueryParams(resourceGid, params);
    }
    throw new Error('unable to get fullId');
  }

  public async save(): Promise<void> {
    if (isNullishOrEmpty(this.data.translatedValue)) {
      await this.delete();
    } else {
      // get up to date digest
      this.data.digest = await this.client.digest(this.data);
      const response = await this.client.register(this.data);
      const newData = response.body;
      if (newData) {
        this.setData(newData);
      }
    }
  }

  public async delete(): Promise<void> {
    await this.client.delete(TranslationModel.parseFullId(this.fullId));
    // make sure to nullify theses values
    this.data.digest = null;
    this.data.outdated = false;
    this.data.translatedValue = null;
    this.data.updatedAt = null;
  }

  public toCodaRow(): TranslationRow {
    const { fullId } = this;
    const { resourceGid, updatedAt, marketId, ...data } = this.data;
    const marketRestId = graphQlGidToId(marketId);

    let obj: Partial<TranslationRow> = {
      ...data,
      updated_at: safeToString(updatedAt),
      marketId: marketRestId,
      id: fullId,
      resourceId: graphQlGidToId(resourceGid),
      resourceType: toConstantCase(graphQlGidToResourceName(resourceGid)),
    };

    if (marketRestId) {
      obj.market = formatMarketReference(marketRestId);
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
