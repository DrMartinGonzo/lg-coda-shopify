// #region Imports

import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { ResultOf, graphQlGidToId } from '../../graphql/utils/graphql-utils';

import { NotFoundError } from '../../Errors/Errors';
import { NOT_FOUND, PACK_IDENTITIES } from '../../constants';
import { metafieldDefinitionFragment } from '../../graphql/metafieldDefinitions-graphql';
import { metaobjectFieldDefinitionFragment } from '../../graphql/metaobjectDefinition-graphql';
import { CODA_PACK_ID } from '../../pack-config.json';
import { FormatRowReferenceFn } from '../CodaRows.types';

// #endregion

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

export function getMetaobjectReferenceSchema(
  fieldDefinition: ResultOf<typeof metafieldDefinitionFragment> | ResultOf<typeof metaobjectFieldDefinitionFragment>
) {
  const metaobjectReferenceDefinitionId = fieldDefinition.validations.find(
    (v) => v.name === 'metaobject_definition_id'
  )?.value;
  if (!metaobjectReferenceDefinitionId) throw new NotFoundError('MetaobjectDefinitionId');

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
      name: PACK_IDENTITIES.Metaobject,
      dynamicUrl: graphQlGidToId(metaobjectReferenceDefinitionId).toString(),
    },
  });
}
