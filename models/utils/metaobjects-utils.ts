// #region Imports
import { ResultOf } from '../../graphql/utils/graphql-utils';

import { NotFoundError } from '../../Errors/Errors';
import { metaobjectFieldDefinitionFragment } from '../../graphql/metaobjectDefinition-graphql';

// #endregion

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
