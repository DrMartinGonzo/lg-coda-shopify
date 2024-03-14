import type { CurrencyCode, Scalars } from '../types/admin.types';
import type { GraphQlResourceName } from './RequestsGraphQl';
import type { MetafieldFieldsFragment } from './admin.generated';

export interface ShopifyRatingField {
  scale_min: number;
  scale_max: number;
  value: number;
}
export interface ShopifyMoneyField {
  currency_code: CurrencyCode;
  amount: number;
}
export interface ShopifyMeasurementField {
  unit: string;
  value: number;
}

/** The input fields for a metafield value to set. */
export type MetafieldRestInput = {
  /**
   * The unique identifier for a metafield within its namespace.
   *
   * Must be 3-64 characters long and can contain alphanumeric, hyphen, and underscore characters.
   *
   */
  key: string;
  /**
   * The container for a group of metafields that the metafield is or will be associated with. Used in tandem
   * with `key` to lookup a metafield on a resource, preventing conflicts with other metafields with the
   * same `key`.
   *
   * Must be 3-255 characters long and can contain alphanumeric, hyphen, and underscore characters.
   *
   */
  namespace: string;
  /**
   * The type of data that is stored in the metafield.
   * The type must be one of the [supported types](https://shopify.dev/apps/metafields/types).
   *
   * Required when there is no corresponding definition for the given `namespace`, `key`, and
   * owner resource type (derived from `ownerId`).
   *
   */
  type: string;
  /**
   * The data stored in the metafield. Always stored as a string, regardless of the metafield's type.
   *
   */
  value: string;
};

/**
 * Types of GraphQL resources to get metafields from that we support.
 */
export type SupportedGraphQlResourceWithMetafields =
  | typeof GraphQlResourceName.Collection
  | typeof GraphQlResourceName.Customer
  | typeof GraphQlResourceName.Location
  | typeof GraphQlResourceName.OnlineStoreArticle
  | typeof GraphQlResourceName.OnlineStoreBlog
  | typeof GraphQlResourceName.OnlineStorePage
  | typeof GraphQlResourceName.Order
  | typeof GraphQlResourceName.Product
  | typeof GraphQlResourceName.ProductVariant
  | typeof GraphQlResourceName.Shop;

export type MetafieldFragmentWithDefinition = MetafieldFieldsFragment & {
  definition: {
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
  };
};
