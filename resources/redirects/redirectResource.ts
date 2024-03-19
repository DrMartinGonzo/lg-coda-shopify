import { RestResourceSingular, RestResourcePlural } from '../../Fetchers/ShopifyRestResource.types';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import type {
  ResourceCreateRestParams,
  Resource,
  ResourceSyncRestParams,
  ResourceUpdateRestParams,
} from '../Resource.types';
import { RedirectSyncTableSchema } from '../../schemas/syncTable/RedirectSchema';
import { RedirectRow } from '../../schemas/CodaRows.types';

// #region Rest Parameters
interface RedirectSyncRestParams extends ResourceSyncRestParams {
  fields: string;
  path?: string;
  target?: string;
}

interface RedirectCreateRestParams extends ResourceCreateRestParams {
  path: string;
  target: string;
}

interface RedirectUpdateRestParams extends ResourceUpdateRestParams {
  path?: string;
  target?: string;
}
// #endregion

export type Redirect = Resource<{
  codaRow: RedirectRow;
  schema: typeof RedirectSyncTableSchema;
  params: {
    sync: RedirectSyncRestParams;
    create: RedirectCreateRestParams;
    update: RedirectUpdateRestParams;
  };
  rest: {
    singular: RestResourceSingular.Redirect;
    plural: RestResourcePlural.Redirect;
  };
}>;

export const redirectResource = {
  display: 'Redirect',
  schema: RedirectSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.UrlRedirect,
  },
  rest: {
    singular: RestResourceSingular.Redirect,
    plural: RestResourcePlural.Redirect,
  },
} as Redirect;
