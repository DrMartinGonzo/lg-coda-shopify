// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { SearchParams } from '../../Clients/RestClient';
import { DEFAULT_CURRENCY_CODE } from '../../config';
import { CACHE_TEN_MINUTES, CODA_SUPPORTED_CURRENCIES, REST_DEFAULT_LIMIT } from '../../constants';
import { RestResourcePlural, RestResourceSingular } from '../types/RestResource.types';
import { GraphQlResourceName } from '../types/GraphQlResource.types';
import { Sync_Shops } from '../../coda/setup/shop-setup';
import { ShopRow } from '../../schemas/CodaRows.types';
import { collectFieldDependencies } from '../../schemas/syncTable/CollectSchema';
import { ShopSyncTableSchema } from '../../schemas/syncTable/ShopSchema';
import { CurrencyCode, MetafieldOwnerType } from '../../types/admin.types';
import { filterObjectKeys } from '../../utils/helpers';
import { BaseContext, FindAllResponse, ResourceDisplayName } from '../Abstract/Rest/AbstractRestResource';
import { FromRow, MakeSyncFunctionArgs, SyncFunction } from '../Abstract/Rest/AbstractSyncedRestResource';
import {
  AbstractSyncedRestResourceWithRestMetafields,
  AugmentWithMetafieldsFunction,
  RestApiDataWithMetafields,
} from '../Abstract/Rest/AbstractSyncedRestResourceWithRestMetafields';
import { Metafield, SupportedMetafieldOwnerResource } from './Metafield';

// #endregion

interface AllArgs extends BaseContext {
  [key: string]: unknown;
  fields?: unknown;
}

export class Shop extends AbstractSyncedRestResourceWithRestMetafields {
  public apiData: RestApiDataWithMetafields & {
    address1: string | null;
    address2: string | null;
    checkout_api_supported: boolean | null;
    city: string | null;
    country: string | null;
    country_code: string | null;
    country_name: string | null;
    county_taxes: boolean | null;
    created_at: string | null;
    currency: string | null;
    customer_email: string | null;
    domain: string | null;
    eligible_for_card_reader_giveaway: boolean | null;
    eligible_for_payments: boolean | null;
    email: string | null;
    enabled_presentment_currencies: string[] | null;
    finances: boolean | null;
    force_ssl: boolean | null;
    google_apps_domain: string | null;
    google_apps_login_enabled: string | null;
    has_discounts: boolean | null;
    has_gift_cards: boolean | null;
    has_storefront: boolean | null;
    iana_timezone: string | null;
    id: number | null;
    latitude: number | null;
    longitude: number | null;
    marketing_sms_consent_enabled_at_checkout: boolean | null;
    money_format: string | null;
    money_in_emails_format: string | null;
    money_with_currency_format: string | null;
    money_with_currency_in_emails_format: string | null;
    multi_location_enabled: boolean | null;
    myshopify_domain: string | null;
    name: string | null;
    password_enabled: boolean | null;
    phone: string | null;
    plan_display_name: string | null;
    plan_name: string | null;
    pre_launch_enabled: boolean | null;
    primary_locale: string | null;
    primary_location_id: number | null;
    province: string | null;
    province_code: string | null;
    requires_extra_payments_agreement: boolean | null;
    setup_required: boolean | null;
    shop_owner: string | null;
    source: string | null;
    tax_shipping: string | null;
    taxes_included: boolean | null;
    timezone: string | null;
    transactional_sms_disabled: boolean | null;
    updated_at: string | null;
    weight_unit: string | null;
    zip: string | null;
  };

  static readonly displayName = 'Shop' as ResourceDisplayName;
  protected static graphQlName = GraphQlResourceName.Shop;
  static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = 'shop';
  static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Shop;
  static readonly supportsDefinitions = true;

  protected static paths: ResourcePath[] = [{ http_method: 'get', operation: 'get', ids: [], path: 'shop.json' }];
  protected static resourceNames: ResourceNames[] = [
    {
      singular: RestResourceSingular.Shop,
      plural: RestResourcePlural.Shop,
    },
  ];

  public static getStaticSchema() {
    return ShopSyncTableSchema;
  }

  protected static augmentWithMetafieldsFunction(context: coda.ExecutionContext): AugmentWithMetafieldsFunction {
    return async () => Metafield.all({ context });
  }

  protected static makeSyncTableManagerSyncFunction({
    context,
    syncTableManager,
  }: MakeSyncFunctionArgs<Shop, typeof Sync_Shops>): SyncFunction {
    return (nextPageQuery: SearchParams = {}, adjustLimit?: number) =>
      this.all({
        context,
        fields: syncTableManager
          .getSyncedStandardFields(collectFieldDependencies)
          .filter((key) => !['admin_url'].includes(key))
          .join(','),
        limit: adjustLimit ?? REST_DEFAULT_LIMIT,

        ...nextPageQuery,
      });
  }

  private static async _find({
    context,
    fields = null,
    options,
    ...otherArgs
  }: AllArgs): Promise<FindAllResponse<Shop>> {
    return this.baseFind<Shop>({
      urlIds: {},
      params: { fields, ...otherArgs },
      context,
      options,
    });
  }

  public static async current(params: AllArgs): Promise<Shop | null> {
    const response = await this._find(params);
    return response.data ? response.data[0] : null;
  }

  public static async activeCurrency({ context }: AllArgs): Promise<CurrencyCode> {
    const response = await this.current({
      context,
      fields: 'currency',
      options: { cacheTtlSecs: CACHE_TEN_MINUTES },
    });

    let currencyCode = DEFAULT_CURRENCY_CODE;
    if (response?.apiData?.currency) {
      const { currency } = response.apiData;
      if (CODA_SUPPORTED_CURRENCIES.includes(currency as any)) {
        currencyCode = currency as CurrencyCode;
      } else {
        console.error(`Shop currency ${currency} not supported. Falling back to ${currencyCode}.`);
      }
    }

    return currencyCode;
  }

  public static async all(params: AllArgs): Promise<FindAllResponse<Shop>> {
    return this._find(params);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected formatToApi({ row }: FromRow<ShopRow>) {
    return {};
  }

  public formatToRow(): ShopRow {
    const { apiData } = this;
    let obj: ShopRow = {
      ...filterObjectKeys(apiData, ['metafields']),
      admin_url: `${this.context.endpoint}/admin`,
    };

    return obj;
  }
}
