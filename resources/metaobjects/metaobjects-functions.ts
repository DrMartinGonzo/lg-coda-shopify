// #region Imports
import { ResultOf } from '../../utils/graphql';

import { NotFoundError } from '../../Errors';
import { metaobjectFieldDefinitionFragment } from '../metaobjectDefinitions/metaobjectDefinition-graphql';

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
// #endregion
