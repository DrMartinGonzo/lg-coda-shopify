// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CustomerClient } from '../../Clients/RestClients';
import { OPTIONS_CONSENT_OPT_IN_LEVEL, OPTIONS_CONSENT_STATE } from '../../constants/options-constants';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames, RestResourcesSingular } from '../../constants/resourceNames-constants';
import { CustomerRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { safeToString } from '../../utils/helpers';
import { formatAddressDisplayName, formatPersonDisplayValue } from '../utils/address-utils';
import { BaseApiDataRest } from './AbstractModelRest';
import {
  AbstractModelRestWithGraphQlMetafields,
  BaseModelDataRestWithGraphQlMetafields,
} from './AbstractModelRestWithMetafields';
import { SupportedMetafieldOwnerResource } from './MetafieldModel';

// #endregion

// #region Types
export interface CustomerApiData extends BaseApiDataRest {
  addresses: { [key: string]: unknown }[] | null;
  created_at: string | null;
  default_address: { [key: string]: unknown } | null;
  email: string | null;
  email_marketing_consent: { state: string; opt_in_level: string } | null;
  first_name: string | null;
  id: number | null;
  last_name: string | null;
  last_order_id: number | null;
  last_order_name: string | null;
  multipass_identifier: string | null;
  note: string | null;
  orders_count: number | null;
  password: string | null;
  password_confirmation: string | null;
  phone: string | null;
  sms_marketing_consent: { state: string; opt_in_level: string } | null;
  state: string | null;
  tags: string | null;
  tax_exempt: boolean | null;
  tax_exemptions: string[] | null;
  total_spent: string | null;
  updated_at: string | null;
  verified_email: boolean | null;
}

export interface CustomerModelData extends CustomerApiData, BaseModelDataRestWithGraphQlMetafields {}
// #endregion

export class CustomerModel extends AbstractModelRestWithGraphQlMetafields {
  public data: CustomerModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Customer;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Customer;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Customer;
  protected static readonly graphQlName = GraphQlResourceNames.Customer;

  private static formatSingleOptInMarketingConsent(accepts: boolean) {
    return {
      state: accepts === true ? OPTIONS_CONSENT_STATE.subscribed.value : OPTIONS_CONSENT_STATE.unSubscribed.value,
      opt_in_level: OPTIONS_CONSENT_OPT_IN_LEVEL.single.value,
    };
  }

  public static createInstanceFromRow(context: coda.ExecutionContext, row: Omit<CustomerRow, 'display'>) {
    const data: Partial<CustomerModelData> = {
      id: row.id,
      addresses: row.addresses,
      created_at: safeToString(row.created_at),
      default_address: row.default_address,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      last_order_id: row.last_order_id,
      last_order_name: row.last_order_name,
      multipass_identifier: row.multipass_identifier,
      note: row.note,
      orders_count: row.orders_count,
      phone: row.phone,
      state: row.state,
      tags: row.tags,
      tax_exempt: row.tax_exempt,
      tax_exemptions: row.tax_exemptions,
      total_spent: safeToString(row.total_spent),
      updated_at: safeToString(row.updated_at),
      verified_email: row.verified_email,
    };

    if (row.accepts_email_marketing !== undefined) {
      data.email_marketing_consent = CustomerModel.formatSingleOptInMarketingConsent(row.accepts_email_marketing);
    }
    if (row.accepts_sms_marketing !== undefined) {
      data.sms_marketing_consent = CustomerModel.formatSingleOptInMarketingConsent(row.accepts_sms_marketing);
    }

    return this.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return CustomerClient.createInstance(this.context);
  }

  public toCodaRow(): CustomerRow {
    const { metafields, addresses, default_address, ...data } = this.data;
    const obj: CustomerRow = {
      ...data,
      admin_url: `${this.context.endpoint}/admin/customers/${data.id}`,
      display: formatPersonDisplayValue({
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
      }),
      total_spent: parseFloat(data.total_spent),

      // Disabled for now, prefer to use simple checkboxes
      // email_marketing_consent: formatEmailMarketingConsent(customer.email_marketing_consent),
      // sms_marketing_consent: formatEmailMarketingConsent(customer.sms_marketing_consent),
    };

    if (default_address) {
      // we don't want to keep customer_id prop in address
      const { customer_id, ...defaultAddressWithoutCustomerId } = default_address;
      obj.default_address = {
        // keep typescript happy
        id: defaultAddressWithoutCustomerId.id as number,
        display: formatAddressDisplayName(default_address),
        ...defaultAddressWithoutCustomerId,
      };
    }
    if (addresses) {
      obj.addresses = addresses.map((address) => {
        const { customer_id, ...addressWithoutCustomerId } = address;
        return {
          // keep typescript happy
          id: addressWithoutCustomerId.id as number,
          display: formatAddressDisplayName(address),
          ...addressWithoutCustomerId,
        };
      });
    }
    if (data.email_marketing_consent) {
      obj.accepts_email_marketing = data.email_marketing_consent.state === OPTIONS_CONSENT_STATE.subscribed.value;
    }
    if (data.sms_marketing_consent) {
      obj.accepts_sms_marketing = data.sms_marketing_consent.state === OPTIONS_CONSENT_STATE.subscribed.value;
    }

    if (metafields) {
      metafields.forEach((metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
