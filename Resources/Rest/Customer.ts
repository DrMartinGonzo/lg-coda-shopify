// #region Imports

import { ResourceNames, ResourcePath } from '@shopify/shopify-api';
import { SyncTableManagerRestWithMetafieldsType } from '../../SyncTableManager/Rest/SyncTableManagerRest';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { MakeSyncFunctionArgs, SyncRestFunction } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Customers } from '../../coda/setup/customers-setup';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { CustomerRow } from '../../schemas/CodaRows.types';
import { augmentSchemaWithMetafields, updateCurrencyCodesInSchemaNew } from '../../schemas/schema-utils';
import {
  CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN,
  CONSENT_STATE__SUBSCRIBED,
  CONSENT_STATE__UNSUBSCRIBED,
  CustomerSyncTableSchema,
  customerFieldDependencies,
} from '../../schemas/syncTable/CustomerSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import {
  arrayUnique,
  deepCopy,
  excludeObjectKeys,
  formatAddressDisplayName,
  formatPersonDisplayValue,
  splitAndTrimValues,
} from '../../utils/helpers';
import { GetSchemaArgs } from '../Abstract/AbstractResource';
import { FindAllRestResponse } from '../Abstract/Rest/AbstractRestResource';
import {
  AbstractRestResourceWithGraphQLMetafields,
  RestApiDataWithMetafields,
} from '../Abstract/Rest/AbstractRestResourceWithMetafields';
import { IMetafield } from '../Mixed/MetafieldHelper';
import { BaseContext, FromRow, TypeFromCodaSchemaProps } from '../types/Resource.types';
import { GraphQlResourceNames, RestResourcesPlural, RestResourcesSingular } from '../types/SupportedResource';
import { SupportedMetafieldOwnerResource } from './Metafield';

// #endregion

export type CustomerCodaData = TypeFromCodaSchemaProps<(typeof CustomerSyncTableSchema)['properties']>;

interface FindArgs extends BaseContext {
  id: number | string;
  fields?: unknown;
}
interface DeleteArgs extends BaseContext {
  id: number | string;
}
interface AllArgs extends BaseContext {
  [key: string]: unknown;
  ids?: unknown;
  since_id?: unknown;
  created_at_min?: unknown;
  created_at_max?: unknown;
  updated_at_min?: unknown;
  updated_at_max?: unknown;
  limit?: unknown;
  fields?: unknown;
  tags?: string[];
}
interface OrdersArgs extends BaseContext {
  [key: string]: unknown;
  id: number | string;
  status?: unknown;
}
interface SearchArgs extends BaseContext {
  [key: string]: unknown;
  order?: unknown;
  query?: unknown;
  limit?: unknown;
  fields?: unknown;
  returnFullResponse?: boolean;
}
interface AccountActivationUrlArgs extends BaseContext {
  [key: string]: unknown;
  body?: { [key: string]: unknown } | null;
}
interface SendInviteArgs extends BaseContext {
  [key: string]: unknown;
  body?: { [key: string]: unknown } | null;
}

export class Customer extends AbstractRestResourceWithGraphQLMetafields {
  public apiData: RestApiDataWithMetafields & {
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
  };

  public static readonly displayName: Identity = PACK_IDENTITIES.Customer;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Customer;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Customer;

  protected static readonly graphQlName = GraphQlResourceNames.Customer;
  protected static readonly paths: ResourcePath[] = [
    { http_method: 'delete', operation: 'delete', ids: ['id'], path: 'customers/<id>.json' },
    { http_method: 'get', operation: 'get', ids: [], path: 'customers.json' },
    { http_method: 'get', operation: 'get', ids: ['id'], path: 'customers/<id>.json' },
    { http_method: 'get', operation: 'orders', ids: ['id'], path: 'customers/<id>/orders.json' },
    { http_method: 'get', operation: 'search', ids: [], path: 'customers/search.json' },
    {
      http_method: 'post',
      operation: 'account_activation_url',
      ids: ['id'],
      path: 'customers/<id>/account_activation_url.json',
    },
    { http_method: 'post', operation: 'post', ids: [], path: 'customers.json' },
    { http_method: 'post', operation: 'send_invite', ids: ['id'], path: 'customers/<id>/send_invite.json' },
    { http_method: 'put', operation: 'put', ids: ['id'], path: 'customers/<id>.json' },
  ];
  protected static readonly resourceNames: ResourceNames[] = [
    {
      singular: RestResourcesSingular.Customer,
      plural: RestResourcesPlural.Customer,
    },
  ];

  public static getStaticSchema() {
    return CustomerSyncTableSchema;
  }

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as CodaSyncParams<typeof Sync_Customers>;
    let augmentedSchema = deepCopy(CustomerSyncTableSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(
        CustomerSyncTableSchema,
        this.metafieldGraphQlOwnerType,
        context
      );
    }

    augmentedSchema = await updateCurrencyCodesInSchemaNew(augmentedSchema, context);

    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public static makeSyncTableManagerSyncFunction({
    context,
    codaSyncParams,
    syncTableManager,
  }: MakeSyncFunctionArgs<
    typeof Sync_Customers,
    SyncTableManagerRestWithMetafieldsType<Customer>
  >): SyncRestFunction<Customer> {
    const [syncMetafields, created_at, updated_at, ids, tags] = codaSyncParams;

    const fieldsArray = syncTableManager.getSyncedStandardFields(customerFieldDependencies);
    if (tags && tags.length) {
      fieldsArray.push('tags');
    }

    return ({ nextPageQuery = {}, limit }) => {
      const params = this.allIterationParams({
        context,
        nextPageQuery,
        limit,
        firstPageParams: {
          fields: arrayUnique(fieldsArray).join(','),
          ids: ids && ids.length ? ids.join(',') : undefined,
          created_at_min: created_at ? created_at[0] : undefined,
          created_at_max: created_at ? created_at[1] : undefined,
          updated_at_min: updated_at ? updated_at[0] : undefined,
          updated_at_max: updated_at ? updated_at[1] : undefined,
          tags,
        },
      });

      return this.all(params);
    };
  }

  public static async find({ context, options, id, fields = null }: FindArgs): Promise<Customer | null> {
    const result = await this.baseFind<Customer>({
      urlIds: { id: id },
      params: { fields: fields },
      context,
      options,
    });
    return result.data ? result.data[0] : null;
  }

  public static async delete({ id, context }: DeleteArgs): Promise<unknown> {
    const response = await this.baseDelete<Customer>({
      urlIds: { id },
      params: {},
      context,
    });
    return response ? response.body : null;
  }

  public static async all({
    context,
    ids = null,
    since_id = null,
    created_at_min = null,
    created_at_max = null,
    updated_at_min = null,
    updated_at_max = null,
    limit = null,
    fields = null,
    options = {},
    tags: filterTags = [],
    ...otherArgs
  }: AllArgs): Promise<FindAllRestResponse<Customer>> {
    const response = await this.baseFind<Customer>({
      context,
      urlIds: {},
      params: {
        ids,
        since_id,
        created_at_min,
        created_at_max,
        updated_at_min,
        updated_at_max,
        limit,
        fields,
        ...otherArgs,
      },
      options,
    });

    // TODO: implement using search endpoint
    return {
      ...response,
      data: response.data.filter((d) => {
        let passCustomerTags = true;
        if (filterTags.length) {
          const customerTags = splitAndTrimValues(d.apiData?.tags ?? '');
          passCustomerTags = customerTags.length && customerTags.some((t) => filterTags.includes(t));
        }
        return passCustomerTags;
      }),
    };
  }

  /*
  public static async orders({ context, options, id, status = null, ...otherArgs }: OrdersArgs): Promise<unknown> {
    const response = await this.request<Customer>({
      http_method: 'get',
      operation: 'orders',
      context,
      urlIds: { id: id },
      params: { status, ...otherArgs },
      body: {},
      entity: null,
      options,
    });

    return response ? response.body : null;
  }
  */

  /*
  public static async search({
    context,
    order = null,
    query = null,
    limit = null,
    fields = null,
    returnFullResponse = false,
    options,
    ...otherArgs
  }: SearchArgs): Promise<unknown> {
    const response = await this.request<Customer>({
      http_method: 'get',
      operation: 'search',
      context,
      urlIds: {},
      params: { order, query, limit, fields, ...otherArgs },
      body: {},
      entity: null,
      options,
    });

    return returnFullResponse ? response : response?.body;
  }
  */

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  /*
  public async account_activation_url({
    options,
    body = null,
    ...otherArgs
  }: AccountActivationUrlArgs): Promise<unknown> {
    const response = await this.request<Customer>({
      http_method: 'post',
      operation: 'account_activation_url',
      context: this.context,
      urlIds: { id: this.id },
      params: { ...otherArgs },
      body: body,
      entity: this,
      options,
    });

    return response ? response.body : null;
  }
  */

  /*
  public async send_invite({ options, body = null, ...otherArgs }: SendInviteArgs): Promise<unknown> {
    const response = await this.request<Customer>({
      http_method: 'post',
      operation: 'send_invite',
      context: this.context,
      urlIds: { id: this.id },
      params: { ...otherArgs },
      body: body,
      entity: this,
      options,
    });

    return response ? response.body : null;
  }
  */

  protected formatToApi({ row, metafields }: FromRow<CustomerRow>) {
    let apiData: Partial<typeof this.apiData> = {
      id: row.id,
      addresses: row.addresses,
      created_at: row.created_at ? row.created_at.toString() : undefined,
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
      total_spent: row.total_spent ? row.total_spent.toString() : undefined,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,
      verified_email: row.verified_email,

      metafields,
    };

    if (row.accepts_email_marketing !== undefined) {
      apiData.email_marketing_consent = {
        state:
          row.accepts_email_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };
    }
    if (row.accepts_sms_marketing !== undefined) {
      apiData.sms_marketing_consent = {
        state: row.accepts_sms_marketing === true ? CONSENT_STATE__SUBSCRIBED.value : CONSENT_STATE__UNSUBSCRIBED.value,
        opt_in_level: CONSENT_OPT_IN_LEVEL__SINGLE_OPT_IN.value,
      };
    }

    return apiData;
  }

  public formatToRow(): CustomerRow {
    const { apiData } = this;

    let obj: CustomerRow = {
      ...excludeObjectKeys(apiData, ['metafields', 'addresses', 'default_address']),
      admin_url: `${this.context.endpoint}/admin/customers/${apiData.id}`,
      display: formatPersonDisplayValue({
        id: apiData.id,
        firstName: apiData.first_name,
        lastName: apiData.last_name,
        email: apiData.email,
      }),
      total_spent: parseFloat(apiData.total_spent),

      // Disabled for now, prefer to use simple checkboxes
      // email_marketing_consent: formatEmailMarketingConsent(customer.email_marketing_consent),
      // sms_marketing_consent: formatEmailMarketingConsent(customer.sms_marketing_consent),
    };

    if (apiData.default_address) {
      // we don't want to keep customer_id prop in address
      const { customer_id, ...defaultAddressWithoutCustomerId } = apiData.default_address;
      obj.default_address = {
        // keep typescript happy
        id: defaultAddressWithoutCustomerId.id as number,
        display: formatAddressDisplayName(apiData.default_address),
        ...defaultAddressWithoutCustomerId,
      };
    }
    if (apiData.addresses) {
      obj.addresses = apiData.addresses.map((address) => {
        const { customer_id, ...addressWithoutCustomerId } = address;
        return {
          // keep typescript happy
          id: addressWithoutCustomerId.id as number,
          display: formatAddressDisplayName(address),
          ...addressWithoutCustomerId,
        };
      });
    }
    if (apiData.email_marketing_consent) {
      obj.accepts_email_marketing = apiData.email_marketing_consent.state === CONSENT_STATE__SUBSCRIBED.value;
    }
    if (apiData.sms_marketing_consent) {
      obj.accepts_sms_marketing = apiData.sms_marketing_consent.state === CONSENT_STATE__SUBSCRIBED.value;
    }

    if (apiData.metafields) {
      apiData.metafields.forEach((metafield: IMetafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
