import * as coda from '@codahq/packs-sdk';
import { CODA_PACK_ID } from '../../pack-config.json';
import { IDENTITY_METAOBJECT, NOT_FOUND } from '../../constants';

import type { MetafieldDefinitionFragment, MetaobjectFieldDefinitionFragment } from '../../types/admin.generated';

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
      description: 'The unique handle of the object.',
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

export function getMetaobjectReferenceSchema(
  fieldDefinition: MetafieldDefinitionFragment | MetaobjectFieldDefinitionFragment
) {
  const metaobjectReferenceDefinitionId = fieldDefinition.validations.find(
    (v) => v.name === 'metaobject_definition_id'
  )?.value;
  if (!metaobjectReferenceDefinitionId)
    throw new Error('MetaobjectDefinitionId not found in fieldDefinition.validations');

  return coda.makeObjectSchema({
    codaType: coda.ValueHintType.Reference,
    properties: {
      id: { type: coda.ValueType.Number, required: true },
      handle: { type: coda.ValueType.String, required: true },
    },
    displayProperty: 'handle',
    idProperty: 'id',
    identity: {
      packId: CODA_PACK_ID,
      name: IDENTITY_METAOBJECT,
      dynamicUrl: metaobjectReferenceDefinitionId,
    },
  });
}
export const formatMetaobjectReference = (id: number, name = NOT_FOUND) => ({ id, name });
