import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { CustomerRow } from '../../schemas/CodaRows.types';
import { CustomerSyncTableSchema } from '../../schemas/syncTable/CustomerSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import type {
  ResourceCreateRestParams,
  ResourceSyncRestParams,
  ResourceUpdateRestParams,
  ResourceWithMetafieldDefinitions,
} from '../Resource.types';
import type { Metafield } from '../metafields/Metafield.types';

// #region Rest Parameters
interface CustomerSyncRestParams extends ResourceSyncRestParams {
  fields: string;
  ids?: string;
  created_at_min?: Date;
  created_at_max?: Date;
  updated_at_min?: Date;
  updated_at_max?: Date;
}

interface CustomerCreateRestParams extends ResourceCreateRestParams {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  note?: string;
  tags?: string;
  email_marketing_consent?: {
    state: string;
    opt_in_level?: string;
  };
  sms_marketing_consent?: {
    state: string;
    opt_in_level?: string;
  };
  metafields?: Metafield.Params.RestInput[];
}

interface CustomerUpdateRestParams extends ResourceUpdateRestParams {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  note?: string;
  tags?: string;
  accepts_email_marketing?: Boolean;
  accepts_sms_marketing?: Boolean;
  email_marketing_consent?: {
    state: string;
    opt_in_level?: string;
  };
  sms_marketing_consent?: {
    state: string;
    opt_in_level?: string;
  };
}
// #endregion

const customerResourceBase = {
  display: 'Customer',
  schema: CustomerSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Customer,
    singular: 'customer',
    plural: 'customers',
  },
  rest: {
    singular: RestResourceSingular.Customer,
    plural: RestResourcePlural.Customer,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Customer,
    useGraphQl: true,
    hasSyncTable: true,
    supportsDefinitions: true,
  },
} as const;

export type Customer = ResourceWithMetafieldDefinitions<
  typeof customerResourceBase,
  {
    codaRow: CustomerRow;
    rest: {
      params: {
        sync: CustomerSyncRestParams;
        create: CustomerCreateRestParams;
        update: CustomerUpdateRestParams;
      };
    };
  }
>;
export const customerResource = customerResourceBase as Customer;
