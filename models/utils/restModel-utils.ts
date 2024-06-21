// #region Imports

import { NotFoundError } from '../../Errors/Errors';
import {
  RestResourcePlural,
  RestResourceSingular,
  RestResourcesPlural,
  RestResourcesSingular,
} from '../../constants/resourceNames-constants';
import { getKeyFromValue } from '../../utils/helpers';
import { ImageApiData } from '../rest/AbstractModelRest';

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

export function formatImageForRow(image: ImageApiData) {
  return {
    image_alt_text: image?.alt ?? null,
    image_url: image?.src ?? null,
  };
}

export function formatImageForData({
  image_alt_text,
  image_url,
}: {
  image_alt_text?: string;
  image_url?: string;
}): ImageApiData | null {
  if (image_alt_text != undefined || image_url != undefined) {
    return {
      alt: image_alt_text,
      src: image_url,
    };
  }
  return undefined;
}
