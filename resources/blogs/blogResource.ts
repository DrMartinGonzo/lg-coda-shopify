import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { BlogRow } from '../../schemas/CodaRows.types';
import { BlogSyncTableSchema } from '../../schemas/syncTable/BlogSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import type {
  ResourceCreateRestParams,
  ResourceSyncRestParams,
  ResourceUpdateRestParams,
  ResourceWithMetafieldDefinitions,
} from '../Resource.types';
import type { Metafield } from '../metafields/Metafield.types';

// #region Rest Parameters
interface BlogSyncRestParams extends ResourceSyncRestParams {
  fields?: string;
  handle?: string;
  // published_status?: string;
  // status?: string;
  // ids?: string;
  // product_type?: string;
  // vendor?: string;
  // created_at_min?: Date | string;
  // created_at_max?: Date | string;
  // updated_at_min?: Date | string;
  // updated_at_max?: Date | string;
  // published_at_min?: Date | string;
  // published_at_max?: Date | string;
}

interface BlogCreateRestParams extends ResourceCreateRestParams {
  title: string;
  handle?: string;
  commentable?: string;
  template_suffix?: string;
  metafields?: Metafield.Params.RestInput[];
}

interface BlogUpdateRestParams extends ResourceUpdateRestParams {
  title?: string;
  handle?: string;
  commentable?: string;
  template_suffix?: string;
  metafields?: Metafield.Params.RestInput[];
}
// #endregion

const blogResourceBase = {
  display: 'Blog',
  schema: BlogSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.OnlineStoreBlog,
  },
  rest: {
    singular: RestResourceSingular.Blog,
    plural: RestResourcePlural.Blog,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Blog,
    useGraphQl: false,
    hasSyncTable: true,
    supportsDefinitions: true,
  },
} as const;

export type Blog = ResourceWithMetafieldDefinitions<
  typeof blogResourceBase,
  {
    codaRow: BlogRow;
    rest: {
      params: {
        sync: BlogSyncRestParams;
        create: BlogCreateRestParams;
        update: BlogUpdateRestParams;
      };
    };
  }
>;
export const blogResource = blogResourceBase as Blog;
