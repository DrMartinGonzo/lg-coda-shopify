import { ArticleSyncTableSchema } from '../../schemas/syncTable/ArticleSchema';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { ArticleRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import {
  ResourceCreateRestParams,
  ResourceSyncRestParams,
  ResourceUpdateRestParams,
  ResourceWithMetafieldDefinitionsNew,
} from '../Resource.types';
import type { Metafield } from '../metafields/Metafield.types';

// #region Rest Parameters
interface ArticleSyncRestParams extends ResourceSyncRestParams {
  fields?: string;
  author?: string;
  tag?: string;
  created_at_max?: Date;
  created_at_min?: Date;
  handle?: string;
  published_at_max?: Date;
  published_at_min?: Date;
  published_status?: string;
  updated_at_max?: Date;
  updated_at_min?: Date;
}

interface ArticleCreateRestParams extends ResourceCreateRestParams {
  blog_id: number;
  author?: string;
  body_html?: string;
  handle?: string;
  image?: {
    src: string;
    alt?: string;
  };
  metafields?: Metafield.Params.RestInput[];
  published_at?: Date;
  published?: boolean;
  summary_html?: string;
  tags?: string;
  template_suffix?: string;
  title?: string;
}

interface ArticleUpdateRestParams extends ResourceUpdateRestParams {
  author?: string;
  blog_id?: number;
  body_html?: string;
  handle?: string;
  image?: {
    alt?: string;
    src?: string;
  };
  published_at?: Date;
  published?: boolean;
  summary_html?: string;
  tags?: string;
  template_suffix?: string;
  title?: string;
}

// #endregion

export type Article = ResourceWithMetafieldDefinitionsNew<{
  codaRow: ArticleRow;
  schema: typeof ArticleSyncTableSchema;
  params: {
    sync: ArticleSyncRestParams;
    create: ArticleCreateRestParams;
    update: ArticleUpdateRestParams;
  };
  rest: {
    singular: RestResourceSingular.Article;
    plural: RestResourcePlural.Article;
  };
  metafields: {
    ownerType: MetafieldOwnerType.Article;
  };
}>;

export const articleResource = {
  display: 'Article',
  schema: ArticleSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.OnlineStoreArticle,
  },
  rest: {
    singular: RestResourceSingular.Article,
    plural: RestResourcePlural.Article,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Article,
    useGraphQl: false,
    hasSyncTable: true,
    supportsDefinitions: true,
  },
} as Article;
