import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { ProductVariantRow } from '../../schemas/CodaRows.types';
import { ProductVariantSyncTableSchema } from '../../schemas/syncTable/ProductVariantSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import {
  ResourceCreateRestParams,
  ResourceUpdateRestParams,
  ResourceWithMetafieldDefinitions,
} from '../Resource.types';
import { Metafield } from '../metafields/Metafield.types';
import { ProductSyncRestParams } from '../products/productResource';

// #region Rest Parameters
interface ProductVariantSyncRestParams extends ProductSyncRestParams {}

interface ProductVariantCreateRestParams extends ResourceCreateRestParams {
  product_id: number;
  option1: string;
  option2?: string;
  option3?: string;
  price?: number;
  sku?: string;
  position?: number;
  taxable?: boolean;
  barcode?: string;
  compare_at_price?: number;
  weight?: number;
  weight_unit?: string;
  metafields?: Metafield.Params.RestInput[];
}

interface ProductVariantUpdateRestParams extends ResourceUpdateRestParams {
  option1?: string;
  option2?: string;
  option3?: string;
  price?: number;
  sku?: string;
  position?: number;
  taxable?: boolean;
  barcode?: string;
  compare_at_price?: number;
  weight?: number;
  weight_unit?: string;
}
// #endregion

const productVariantResourceBase = {
  display: 'Product Variant',
  schema: ProductVariantSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.ProductVariant,
    singular: 'productVariant',
    plural: 'productVariants',
  },
  rest: {
    singular: RestResourceSingular.ProductVariant,
    plural: RestResourcePlural.ProductVariant,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Productvariant,
    useGraphQl: true,
    hasSyncTable: true,
    supportsDefinitions: true,
  },
} as const;

export type ProductVariant = ResourceWithMetafieldDefinitions<
  typeof productVariantResourceBase,
  {
    codaRow: ProductVariantRow;
    rest: {
      params: {
        sync: ProductVariantSyncRestParams;
        create: ProductVariantCreateRestParams;
        update: ProductVariantUpdateRestParams;
      };
    };
  }
>;
export const productVariantResource = productVariantResourceBase as ProductVariant;
