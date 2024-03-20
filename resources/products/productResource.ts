import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { ProductRow } from '../../schemas/CodaRows.types';
import { ProductSyncTableSchemaRest } from '../../schemas/syncTable/ProductSchemaRest';
import { MetafieldOwnerType } from '../../types/admin.types';
import type {
  ResourceCreateRestParams,
  ResourceSyncRestParams,
  ResourceUpdateRestParams,
  ResourceWithMetafieldDefinitions,
} from '../Resource.types';
import type { Metafield } from '../metafields/Metafield.types';

export const MAX_OPTIONS_PER_PRODUCT = 3;

// #region Rest Parameters
export interface ProductSyncRestParams extends ResourceSyncRestParams {
  fields?: string;
  published_status?: string;
  status?: string;
  handle?: string;
  ids?: string;
  product_type?: string;
  vendor?: string;
  created_at_min?: Date | string;
  created_at_max?: Date | string;
  updated_at_min?: Date | string;
  updated_at_max?: Date | string;
  published_at_min?: Date | string;
  published_at_max?: Date | string;
}

interface ProductCreateRestParams extends ResourceCreateRestParams {
  title?: string;
  body_html?: string;
  product_type?: string;
  options?: {
    name: string;
    values: string[];
  }[];
  tags?: string;
  vendor?: string;
  status?: string;
  handle?: string;
  images?: { src: string }[];
  variants?: {
    option1: string;
    option2: string;
    option3: string;
  }[];
  template_suffix?: string;
  metafields?: Metafield.Params.RestInput[];
}

interface ProductUpdateRestParams extends ResourceUpdateRestParams {
  title?: string;
  body_html?: string;
  product_type?: string;
  tags?: string;
  vendor?: string;
  status?: string;
  handle?: string;
  template_suffix?: string;
}
// #endregion

const productResourceBase = {
  display: 'Product',
  schema: ProductSyncTableSchemaRest,
  graphQl: {
    name: GraphQlResourceName.Product,
    singular: 'product',
    plural: 'products',
  },
  rest: {
    singular: RestResourceSingular.Product,
    plural: RestResourcePlural.Product,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Product,
    useGraphQl: true,
    hasSyncTable: true,
    supportsDefinitions: true,
  },
} as const;

export type Product = ResourceWithMetafieldDefinitions<
  typeof productResourceBase,
  {
    codaRow: ProductRow;
    rest: {
      params: {
        sync: ProductSyncRestParams;
        create: ProductCreateRestParams;
        update: ProductUpdateRestParams;
      };
    };
  }
>;
export const productResource = productResourceBase as Product;
