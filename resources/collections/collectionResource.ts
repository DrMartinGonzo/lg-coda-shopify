import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { CollectionRow } from '../../schemas/CodaRows.types';
import { CollectionSyncTableSchema } from '../../schemas/syncTable/CollectionSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import type {
  ResourceCreateRestParams,
  ResourceSyncRestParams,
  ResourceUpdateRestParams,
  ResourceWithMetafieldDefinitions,
} from '../Resource.types';
import type { Metafield } from '../metafields/Metafield.types';

// #region Rest Parameters
export interface CollectionSyncRestParams extends ResourceSyncRestParams {
  fields?: string;
  ids?: string;
  handle?: string;
  product_id?: number;
  title?: string;
  published_status?: string;
  created_at_min?: Date;
  created_at_max?: Date;
  updated_at_min?: Date;
  updated_at_max?: Date;
  published_at_min?: Date;
  published_at_max?: Date;
}

export interface CollectionCreateRestParams extends ResourceCreateRestParams {
  title?: string;
  body_html?: string;
  handle?: string;
  image?: {
    alt?: string;
    src?: string;
  };
  published?: boolean;
  template_suffix?: string;
  metafields?: Metafield.Params.RestInput[];
}

export interface CollectionUpdateRestParams extends ResourceUpdateRestParams {
  title?: string;
  handle?: string;
  commentable?: string;
  template_suffix?: string;
  metafields?: Metafield.Params.RestInput[];
}
// #endregion

const collectionResourceBase = {
  display: 'Collection',
  schema: CollectionSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Collection,
    singular: 'collection',
    plural: 'collections',
  },
  rest: {
    singular: RestResourceSingular.Collection,
    plural: RestResourcePlural.Collection,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Collection,
    useGraphQl: true,
    hasSyncTable: true,
    supportsDefinitions: true,
  },
} as const;

export type Collection = ResourceWithMetafieldDefinitions<
  typeof collectionResourceBase,
  {
    codaRow: CollectionRow;
    rest: {
      params: {
        sync: CollectionSyncRestParams;
        create: CollectionCreateRestParams;
        update: CollectionUpdateRestParams;
      };
    };
  }
>;
export const collectionResource = collectionResourceBase as Collection;
