import type { CurrencyCode, Metafield, MetafieldDefinition, MetafieldOwnerType, Scalars } from '../types/admin.types';
import { MetafieldDefinitionFragment, MetafieldFieldsFragment } from './admin.generated';

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

/** An interface describing a metafield with its value parsed and acompagnying augmented definition */
export interface ParsedMetafieldWithAugmentedDefinition extends Metafield {
  value: any;
  augmentedDefinition: AugmentedMetafieldDefinition;
}

/** An interface describing a metafield definition with some extra props */
export interface AugmentedMetafieldDefinition extends MetafieldDefinitionFragment {
  fullKey: string;
  matchingSchemaKey: string;
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
  | 'Collection'
  | 'Customer'
  | 'Location'
  | 'OnlineStoreArticle'
  | 'OnlineStoreBlog'
  | 'OnlineStorePage'
  | 'Order'
  | 'Product'
  | 'ProductVariant'
  | 'Shop';

/**
 * An interface describing a resource metafields sync table definition.
 * On s'en sert pour définir la dynamicUrl de chaque sync table à partir de key.
 * Du coup derrière on peut récupérer les autres infos comme les parties d'url, etc…
 */
export interface ResourceMetafieldsSyncTableDefinition {
  /** The resource type, acting as key */
  key: SupportedGraphQlResourceWithMetafields;
  /** The type of the owner of this metafield */
  metafieldOwnerType: MetafieldOwnerType;
  /** The human readable display value of resource type*/
  display: string;
  /** The url part to access the resource metafield settings in Shopify admin */
  metafieldsSettingsUrlPart: string;
  /** The url part to access the resource metafields in Shopify admin */
  editMetafieldUrlPart: string;
  /** The url part to access the owner via Rest Admin API */
  ownerRestUrlPart: string;
  /** The query operation used to request all owners and their Metafields */
  syncTableGraphQlQueryOperation: string;
  /** The query operation used to request a specific owner and its Metafields */
  graphQlQueryOperation: string;
  /** Wether we should use storefront to query these metafields or not */
  storeFront?: boolean;
}

export type MetafieldFragmentWithDefinition = MetafieldFieldsFragment & {
  definition: {
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
  };
};
