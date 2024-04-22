import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/coda-properties';
import { NOT_FOUND } from '../../constants';
import { FormatRowReferenceFn } from '../CodaRows.types';

export const MetaObjectSyncTableBaseSchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('metaobject'),
    graphql_gid: PROPS.makeGraphQlGidProp('metaobject'),
    handle: {
      ...PROPS.makeHandleProp('metaobject'),
      required: true,
      mutable: true,
    },
    updatedAt: PROPS.makeUpdatedAtProp('metaobject', 'updatedAt', 'updatedAt'),
    admin_url: PROPS.makeAdminUrlProp('metaobject'),
  },
  displayProperty: 'handle',
  idProperty: 'id',
  featuredProperties: ['id', 'handle'],
});

export const formatMetaobjectReference: FormatRowReferenceFn<number, 'name'> = (id: number, name = NOT_FOUND) => ({
  id,
  name,
});
