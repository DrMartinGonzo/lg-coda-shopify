// #region Imports
import { NotFoundError } from '../../Errors';
import { MetafieldDefinition } from '../../Fetchers/NEW/Resources/MetafieldDefinition';

// #endregion

// #region Helpers
// TODO: move elsewhere
function findMatchingMetafieldDefinition(
  fullKey: string,
  metafieldDefinitions: Array<MetafieldDefinition>
): MetafieldDefinition {
  return metafieldDefinitions.find((f) => f && f.fullKey === fullKey);
}
export function requireMatchingMetafieldDefinition(
  fullKey: string,
  metafieldDefinitions: Array<MetafieldDefinition>
): MetafieldDefinition {
  const metafieldDefinition = findMatchingMetafieldDefinition(fullKey, metafieldDefinitions);
  if (!metafieldDefinition) throw new NotFoundError('MetafieldDefinition');
  return metafieldDefinition;
}
// #endregion
