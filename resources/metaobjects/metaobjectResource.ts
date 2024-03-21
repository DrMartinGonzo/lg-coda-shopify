import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { MetaobjectRow } from '../../schemas/CodaRows.types';
import { MetaObjectSyncTableBaseSchema } from '../../schemas/syncTable/MetaObjectSchema';
import { Resource } from '../Resource.types';
import {
  buildQueryAllMetaObjectsWithFields,
  buildQuerySingleMetaObjectWithFields,
  buildUpdateMetaObjectMutation,
  createMetaobjectMutation,
  deleteMetaobjectMutation,
} from './metaobjects-graphql';

// #region GraphQl Parameters

// #endregion

// TODO: finish this
const metaobjectResourceBase = {
  display: 'Metaobject',
  schema: MetaObjectSyncTableBaseSchema,
  graphQl: {
    name: GraphQlResourceName.Metaobject,
    singular: 'metaobject',
    plural: 'metaobjects',
    operations: {
      fetchSingle: buildQuerySingleMetaObjectWithFields,
      fetchAll: buildQueryAllMetaObjectsWithFields,
      create: createMetaobjectMutation,
      update: buildUpdateMetaObjectMutation,
      delete: deleteMetaobjectMutation,
    },
  },
  rest: {
    // TODO: fix this
    singular: RestResourceSingular.Collection,
    // TODO: fix this
    plural: RestResourcePlural.Collection,
  },
} as const;

export type Metaobject = Resource<
  typeof metaobjectResourceBase,
  {
    codaRow: MetaobjectRow;
    rest: {
      params: {};
    };
  }
>;

export const metaobjectResource = metaobjectResourceBase as Metaobject;
