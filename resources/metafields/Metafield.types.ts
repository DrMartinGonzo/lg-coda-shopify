import { MetafieldRow } from '../../schemas/CodaRows.types';
import { CurrencyCode } from '../../types/admin.types';
import { ResultOf } from '../../types/graphql';
import { ResourceSyncRestParams } from '../Resource.types';
import { MetafieldFieldsFragment, MetafieldFieldsFragmentWithDefinition } from './metafields-graphql';

export declare namespace Metafield {
  type Row = MetafieldRow;

  namespace Params {
    interface Sync extends ResourceSyncRestParams {
      fields: string;
    }

    /** The input fields for a metafield value to set. */
    interface RestInput {
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
    }
  }

  namespace Fields {
    interface Rating {
      scale_min: number;
      scale_max: number;
      value: number;
    }
    interface Money {
      currency_code: CurrencyCode;
      amount: number;
    }
    interface Measurement {
      unit: string;
      value: number;
    }
  }
}

export type MetafieldFragmentWithDefinition = Omit<
  ResultOf<typeof MetafieldFieldsFragmentWithDefinition>,
  'fragmentRefs'
> &
  Omit<ResultOf<typeof MetafieldFieldsFragment>, 'fragmentRefs'>;
