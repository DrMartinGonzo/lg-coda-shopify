import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { RedirectRow } from '../../schemas/CodaRows.types';
import { RedirectSyncTableSchema } from '../../schemas/syncTable/RedirectSchema';
import type {
  ResourceCreateRestParams,
  Resource,
  ResourceSyncRestParams,
  ResourceUpdateRestParams,
} from '../Resource.types';

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

const redirectResourceBase = {
  display: 'Redirect',
  schema: RedirectSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.UrlRedirect,
  },
  rest: {
    singular: RestResourceSingular.Redirect,
    plural: RestResourcePlural.Redirect,
  },
} as const;

export type Redirect = Resource<
  typeof redirectResourceBase,
  {
    codaRow: RedirectRow;
    rest: {
      params: {
        sync: RedirectSyncRestParams;
        create: RedirectCreateRestParams;
        update: RedirectUpdateRestParams;
      };
    };
  }
>;
export const redirectResource = redirectResourceBase as Redirect;
