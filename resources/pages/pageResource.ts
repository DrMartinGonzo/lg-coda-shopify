import { PageSyncTableSchema } from '../../schemas/syncTable/PageSchema';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { PageRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import {
  ResourceCreateRestParams,
  ResourceSyncRestParams,
  ResourceUpdateRestParams,
  ResourceWithMetafieldDefinitionsNew,
} from '../Resource.types';
import { Metafield } from '../metafields/Metafield.types';

// #region Rest Parameters
interface PageSyncRestParams extends ResourceSyncRestParams {
  fields?: string;
  handle?: string;
  since_id?: number;
  title?: string;
  published_status?: string;
  created_at_min?: Date;
  created_at_max?: Date;
  updated_at_min?: Date;
  updated_at_max?: Date;
  published_at_min?: Date;
  published_at_max?: Date;
}

interface PageCreateRestParams extends ResourceCreateRestParams {
  title: string;
  handle?: string;
  published?: boolean;
  published_at?: Date;
  body_html?: string;
  author?: string;
  template_suffix?: string;
  metafields?: Metafield.Params.RestInput[];
}

interface PageUpdateRestParams extends ResourceUpdateRestParams {
  handle?: string;
  published?: boolean;
  published_at?: Date;
  title?: string;
  body_html?: string;
  author?: string;
  template_suffix?: string;
  metafields?: Metafield.Params.RestInput[];
}
// #endregion

export type Page = ResourceWithMetafieldDefinitionsNew<{
  codaRow: PageRow;
  schema: typeof PageSyncTableSchema;
  params: {
    sync: PageSyncRestParams;
    create: PageCreateRestParams;
    update: PageUpdateRestParams;
  };
  rest: {
    singular: RestResourceSingular.Page;
    plural: RestResourcePlural.Page;
  };
  metafields: {
    ownerType: MetafieldOwnerType.Page;
  };
}>;

export const pageResource = {
  display: 'Page',
  schema: PageSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.OnlineStorePage,
  },
  rest: {
    singular: RestResourceSingular.Page,
    plural: RestResourcePlural.Page,
  },
  metafields: {
    ownerType: MetafieldOwnerType.Page,
    useGraphQl: false,
    hasSyncTable: true,
    supportsDefinitions: true,
  },
} as Page;
