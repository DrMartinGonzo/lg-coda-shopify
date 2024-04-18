import * as coda from '@codahq/packs-sdk';

import { NOT_FOUND } from '../../constants';
import { FormatRowReferenceFn } from '../CodaRows.types';

export const MetaObjectSyncTableBaseSchema = coda.makeObjectSchema({
  properties: {
    id: { type: coda.ValueType.Number, fromKey: 'id', required: true, useThousandsSeparator: false },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the Metaobject.',
    },
    handle: {
      type: coda.ValueType.String,
      required: true,
      mutable: true,
      description:
        "The unique handle of the object. If you update the handle, the old handle won't be redirected to the new one automatically.",
    },
    updatedAt: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      fixedId: 'updatedAt',
      fromKey: 'updatedAt',
      description: 'When the object was last updated.',
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the metaobject in the Shopify admin.',
    },
  },
  displayProperty: 'handle',
  idProperty: 'id',
  featuredProperties: ['id', 'handle'],
});

export const formatMetaobjectReference: FormatRowReferenceFn<number, 'name'> = (id: number, name = NOT_FOUND) => ({
  id,
  name,
});
