// #region Imports

import { ShopClient } from '../../Clients/RestClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames, RestResourcesSingular } from '../../constants/resourceNames-constants';
import { ShopRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { formatMetafieldsForOwnerRow } from '../utils/metafields-utils';
import { BaseApiDataRest } from './AbstractModelRest';
import {
  AbstractModelRestWithGraphQlMetafields,
  BaseModelDataRestWithGraphQlMetafields,
} from './AbstractModelRestWithMetafields';
import { SupportedMetafieldOwnerResource } from './MetafieldModel';

// #endregion

// #region Types
export interface ShopApiData extends BaseApiDataRest {
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
  myshopify_domain: string | null;
  name: string | null;
  password_enabled: boolean | null;
  phone: string | null;
  plan_display_name: string | null;
  plan_name: string | null;
  pre_launch_enabled: boolean | null;
  primary_locale: string | null;
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
}

export interface ShopModelData extends ShopApiData, BaseModelDataRestWithGraphQlMetafields {}
// #endregion

export class ShopModel extends AbstractModelRestWithGraphQlMetafields {
  public data: ShopModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Shop;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Shop;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Shop;
  protected static readonly graphQlName = GraphQlResourceNames.Shop;

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return ShopClient.createInstance(this.context);
  }

  public toCodaRow(): ShopRow {
    const { metafields = [], ...data } = this.data;
    const obj: ShopRow = {
      ...data,
      admin_url: `${this.context.endpoint}/admin`,
      ...formatMetafieldsForOwnerRow(metafields),
    };

    return obj as ShopRow;
  }
}
