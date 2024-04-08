import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular, RestResources } from '../../Fetchers/ShopifyRestResource.types';
import { MetafieldRow } from '../../schemas/CodaRows.types';
import { MetafieldSyncTableSchema } from '../../schemas/syncTable/MetafieldSchema';
import { Resource, ResourceSyncRestParams } from '../Resource.types';

// #region Rest Parameters
interface MetafieldSyncRestParams extends ResourceSyncRestParams {
  /** Show metafields with given namespace */
  namespace?: string;
  /** Show metafields with given key */
  key?: string;
}

// interface MetafieldCreateRestParams extends ResourceCreateRestParams {
//   blog_id: number;
//   author?: string;
//   body_html?: string;
//   handle?: string;
//   image?: {
//     src: string;
//     alt?: string;
//   };
//   metafields?: Metafield.Params.RestInput[];
//   published_at?: Date;
//   published?: boolean;
//   summary_html?: string;
//   tags?: string;
//   template_suffix?: string;
//   title?: string;
// }

// interface MetafieldUpdateRestParams extends ResourceUpdateRestParams {
//   author?: string;
//   blog_id?: number;
//   body_html?: string;
//   handle?: string;
//   image?: {
//     alt?: string;
//     src?: string;
//   };
//   published_at?: Date;
//   published?: boolean;
//   summary_html?: string;
//   tags?: string;
//   template_suffix?: string;
//   title?: string;
// }
// #endregion

const metafieldResourceBase = {
  display: 'Metafield',
  schema: MetafieldSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.Metafield,
    singular: 'metafield',
    plural: 'metafields',
  },
  rest: {
    singular: RestResourceSingular.Metafield,
    plural: RestResourcePlural.Metafield,
  },
} as const;

export type Metafield = Resource<
  typeof metafieldResourceBase,
  {
    codaRow: MetafieldRow;
    rest: {
      type: RestResources['Metafield'];
      params: {
        sync: MetafieldSyncRestParams;
      };
    };
  }
>;

export const metafieldResource = metafieldResourceBase as Metafield;
