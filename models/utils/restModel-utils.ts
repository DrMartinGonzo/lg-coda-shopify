// #region Imports

import { NotFoundError } from '../../Errors/Errors';
import {
  RestResourcePlural,
  RestResourceSingular,
  RestResourcesPlural,
  RestResourcesSingular,
} from '../../constants/resourceNames-constants';
import { getKeyFromValue } from '../../utils/helpers';

// #endregion

export function singularToPlural(singular: RestResourceSingular): RestResourcePlural {
  const resourceKey = getKeyFromValue(RestResourcesSingular, singular);
  const plural = RestResourcesPlural[resourceKey];
  if (plural === undefined) throw new NotFoundError('plural');
  return plural;
}

export function pluralToSingular(plural: RestResourcePlural): RestResourceSingular {
  const resourceKey = getKeyFromValue(RestResourcesPlural, plural);
  const singular = RestResourcesSingular[resourceKey];
  if (plural === undefined) throw new NotFoundError('singular');
  return singular;
}
