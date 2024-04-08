import { GraphQlResourceName } from '../ShopifyResource.types';
import { RestResourcePlural, RestResourceSingular } from '../ShopifyResource.types';
import { MetaobjectRow } from '../../schemas/CodaRows.types';
import { MetaObjectSyncTableBaseSchema } from '../../schemas/syncTable/MetaObjectSchema';
import { ResourceWithSchema } from '../Resource.types';

const metaobjectResourceBase = {
  display: 'Metaobject',
  schema: MetaObjectSyncTableBaseSchema,
  graphQl: {
    name: GraphQlResourceName.Metaobject,
    singular: 'metaobject',
    plural: 'metaobjects',
  },
  rest: {
    // TODO: fix this
    singular: RestResourceSingular.Collection,
    // TODO: fix this
    plural: RestResourcePlural.Collection,
  },
} as const;

export type Metaobject = ResourceWithSchema<
  typeof metaobjectResourceBase,
  {
    codaRow: MetaobjectRow;
  }
>;

export const metaobjectResource = metaobjectResourceBase as Metaobject;
