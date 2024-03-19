import * as coda from '@codahq/packs-sdk';
import { SimpleRest } from '../../Fetchers/SimpleRest';
import { formatAddressDisplayName, formatPersonDisplayValue } from '../../utils/helpers';
import {
  CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN,
  CONSENT_STATE__SUBSCRIBED,
  CONSENT_STATE__UNSUBSCRIBED,
} from '../../schemas/syncTable/CustomerSchema';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { Customer, customerResource } from './customerResource';

import type { CodaMetafieldKeyValueSet } from '../../helpers-setup';

export class CustomerRestFetcher extends SimpleRest<Customer> {
  constructor(context: coda.ExecutionContext) {
    super(customerResource, context);
  }

  formatRowToApi = (
    row: Partial<Customer['codaRow']>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Customer['rest']['params']['update'] | Customer['rest']['params']['create'] | undefined => {
    let restParams: Customer['rest']['params']['update'] & Customer['rest']['params']['create'] = {};

    if (row.first_name !== undefined) restParams.first_name = row.first_name;
    if (row.last_name !== undefined) restParams.last_name = row.last_name;
    if (row.email !== undefined) restParams.email = row.email;
    if (row.phone !== undefined) restParams.phone = row.phone;
    if (row.note !== undefined) restParams.note = row.note;
    if (row.tags !== undefined) restParams.tags = row.tags;

    if (row.accepts_email_marketing !== undefined)
      restParams.email_marketing_consent = {
        state:
          row.accepts_email_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };
    if (row.accepts_sms_marketing !== undefined)
      restParams.sms_marketing_consent = {
        state: row.accepts_sms_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };

    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restParams = { ...restParams, metafields: metafieldRestInputs } as Customer['rest']['params']['create'];
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (customer): Customer['codaRow'] => {
    let obj: Customer['codaRow'] = {
      ...customer,
      admin_url: `${this.context.endpoint}/admin/customers/${customer.id}`,
      display: formatPersonDisplayValue({
        id: customer.id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
      }),
      total_spent: parseFloat(customer.total_spent),
      // Disabled for now, prefer to use simple checkboxes
      // email_marketing_consent: formatEmailMarketingConsent(customer.email_marketing_consent),
      // sms_marketing_consent: formatEmailMarketingConsent(customer.sms_marketing_consent),
    };

    if (customer.default_address) {
      // we don't want to keep customer_id prop in address
      const { customer_id, ...defaultAddressWithoutCustomerId } = customer.default_address;
      obj.default_address = {
        display: formatAddressDisplayName(customer.default_address),
        ...defaultAddressWithoutCustomerId,
      };
    }
    if (customer.addresses) {
      obj.addresses = customer.addresses.map((address) => {
        const { customer_id, ...addressWithoutCustomerId } = address;
        return {
          display: formatAddressDisplayName(address),
          ...addressWithoutCustomerId,
        };
      });
    }
    if (customer.email_marketing_consent) {
      obj.accepts_email_marketing = customer.email_marketing_consent.state === CONSENT_STATE__SUBSCRIBED.value;
    }
    if (customer.sms_marketing_consent) {
      obj.accepts_sms_marketing = customer.sms_marketing_consent.state === CONSENT_STATE__SUBSCRIBED.value;
    }

    return obj;
  };

  updateWithMetafields = async (
    row: { original?: Customer['codaRow']; updated: Customer['codaRow'] },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<Customer['codaRow']> => this._updateWithMetafieldsGraphQl(row, metafieldKeyValueSets);
}
