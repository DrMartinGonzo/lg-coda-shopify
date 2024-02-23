import { METAFIELD_TYPES, METAFIELD_LEGACY_TYPES } from '../metafields/metafields-constants';
import type { CurrencyCode, Metafield, MetafieldOwnerType, Scalars } from '../types/admin.types';
import { GraphQlResource } from './RequestsGraphQl';
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
  | typeof GraphQlResource.Collection
  | typeof GraphQlResource.Customer
  | typeof GraphQlResource.Location
  | typeof GraphQlResource.OnlineStoreArticle
  | typeof GraphQlResource.OnlineStoreBlog
  | typeof GraphQlResource.OnlineStorePage
  | typeof GraphQlResource.Order
  | typeof GraphQlResource.Product
  | typeof GraphQlResource.ProductVariant
  | typeof GraphQlResource.Shop;

/**
 * An interface describing a resource metafields sync table definition.
 * On s'en sert pour définir la dynamicUrl de chaque sync table à partir de key.
 * Du coup derrière on peut récupérer les autres infos comme les parties d'url, etc…
 */
export interface ResourceMetafieldsSyncTableDefinition {
  /** The GraphQL resource type, acting as key */
  key: SupportedGraphQlResourceWithMetafields;
  /** Possible types of a metafield's owner resource */
  metafieldOwnerType: MetafieldOwnerType;
  /** The human readable display value of resource type */
  display: string;
  /** The query operation used to request all owners and their Metafields */
  syncTableGraphQlQueryOperation: string;
  /** The query operation used to request a specific owner and its Metafields */
  graphQlQueryOperation: string;
  /** Wether we should use storefront to query these metafields or not */
  storeFront?: boolean;
  /** Wether MetafieldDefinitions are supported in Shopify Admin for this resource */
  supportMetafieldDefinitions: boolean;
}

export type MetafieldFragmentWithDefinition = MetafieldFieldsFragment & {
  definition: {
    /** A globally-unique ID. */
    id: Scalars['ID']['output'];
  };
};

type MetafieldTypes = typeof METAFIELD_TYPES;
/** A union of all the supported `metafield.type`s */
export type MetafieldTypeValue = MetafieldTypes[keyof MetafieldTypes];

type MetafieldLegacyTypes = typeof METAFIELD_LEGACY_TYPES;
/** A union of all the supported legacy `metafield.type`s */
type MetafieldLegacyTypeValue = MetafieldLegacyTypes[keyof MetafieldLegacyTypes];

/** A union of all the supported modern and legacy `metafield.type`s */
export type AllMetafieldTypeValue = MetafieldTypeValue | MetafieldLegacyTypeValue;
