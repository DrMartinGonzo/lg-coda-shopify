// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf } from './tada-utils';

import { NotFoundError } from '../Errors/Errors';
import { PACK_IDENTITIES } from '../constants';
import { metafieldDefinitionFragment } from '../graphql/metafieldDefinitions-graphql';
import { metaobjectFieldDefinitionFragment } from '../graphql/metaobjectDefinition-graphql';
import { CODA_PACK_ID } from '../pack-config.json';
import { graphQlGidToId } from './conversion-utils';

// #endregion

// #region Helpers
function findMatchingMetaobjectFieldDefinition(
  key: string,
  fieldDefinitions: Array<ResultOf<typeof metaobjectFieldDefinitionFragment>>
) {
  return fieldDefinitions.find((f) => f.key === key);
}
export function requireMatchingMetaobjectFieldDefinition(
  fullKey: string,
  fieldDefinitions: Array<ResultOf<typeof metaobjectFieldDefinitionFragment>>
) {
  const MetaobjectFieldDefinition = findMatchingMetaobjectFieldDefinition(fullKey, fieldDefinitions);
  if (!MetaobjectFieldDefinition) throw new NotFoundError('MetaobjectFieldDefinition');
  return MetaobjectFieldDefinition;
}

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
// #endregion
