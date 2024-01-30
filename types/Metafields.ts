import type { CurrencyCode, Metafield, MetafieldDefinition } from '../types/admin.types';
import { MetafieldDefinitionFragment } from './admin.generated';

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
  matchingSchemaGidKey: string;
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
