// #region Imports
import * as coda from '@codahq/packs-sdk';
// import slugify from 'slugify';

import { DEFAULT_THUMBNAIL_SIZE } from '../config';
import { IS_ADMIN_RELEASE } from '../pack-config.json';
import { FieldDependency } from '../schemas/Schema.types';
import { LengthUnit, WeightUnit } from '../types/admin.types';
import { FULL_SIZE } from '../constants';

// #endregion

export function isString(value: any) {
  return typeof value === 'string' || value instanceof String;
}

export function capitalizeFirstChar(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const convertTTCtoHT = (price, taxRate) => {
  return taxRate ? price / (1 + taxRate) : price;
};

/**
 * Extracts the name from the given file URL.
 *
 * @param  url - The file URL
 * @return The extracted name from the file URL
 */
export function extractNameFromFileUrl(url: string) {
  return url.split('/').pop().split('?').shift();
}

export const weightUnitsMap: { [key in WeightUnit]: string } = {
  // WEIGHT
  GRAMS: 'g',
  KILOGRAMS: 'kg',
  OUNCES: 'oz',
  POUNDS: 'lb',
};
const dimensionUnitsMap: { [key in LengthUnit]: string } = {
  CENTIMETERS: 'cm',
  FEET: 'pi',
  INCHES: 'po',
  METERS: 'm',
  MILLIMETERS: 'mm',
  YARDS: 'yd',
};
const volumeUnitsMap = {
  MILLILITERS: 'ml',
  CENTILITERS: 'cl',
  LITERS: 'l',
  CUBIC_METERS: 'm³',
  FLUID_OUNCES: 'oz liq.',
  PINTS: 'pt',
  QUARTS: 'qt',
  GALLONS: 'gal',
  IMPERIAL_FLUID_OUNCES: 'oz liq. imp.',
  IMPERIAL_PINTS: 'pt imp.',
  IMPERIAL_QUARTS: 'qt imp.',
  IMPERIAL_GALLONS: 'gal imp.',
};
export function getUnitMap(measurementType: string) {
  switch (measurementType) {
    case 'weight':
      return weightUnitsMap;
    case 'dimension':
      return dimensionUnitsMap;
    case 'volume':
      return volumeUnitsMap;
    default:
      throw new coda.UserVisibleError(`Invalid measurement type: ${measurementType}`);
  }
}

export function unitToShortName(unit: string) {
  const allUnitsMap = { ...weightUnitsMap, ...dimensionUnitsMap, ...volumeUnitsMap };
  const unitShortName = allUnitsMap[unit];
  if (!unitShortName) {
    console.log(`Unknown unit: ${unit}`);
    return '';
  }
  return unitShortName;
}

export function extractValueAndUnitFromMeasurementString(
  measurementString: string,
  measurementType: string
): {
  value: number;
  unit: WeightUnit | LengthUnit | string;
  unitFull: string;
} {
  const unitsMap = getUnitMap(measurementType);
  const possibleUnits = Object.values(unitsMap);
  const measurementRegex = /^(\d+(\.\d+)?)\s*([a-zA-Z²³µ]*)$/;

  const match = measurementString.match(measurementRegex);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[3];

    if (possibleUnits.includes(unit)) {
      const unitFull = Object.keys(unitsMap)[possibleUnits.indexOf(unit)];
      return { value, unit, unitFull };
    } else {
      throw new coda.UserVisibleError(`Invalid unit: ${unit}`);
    }
  } else {
    throw new coda.UserVisibleError(`Invalid measurement string: ${measurementString}`);
  }
}

export function getThumbnailUrlFromFullUrl(url: string, thumbnailSize: string | number) {
  const parsedPreviewSize =
    typeof thumbnailSize === 'number'
      ? Math.floor(thumbnailSize)
      : thumbnailSize === FULL_SIZE
      ? undefined
      : parseInt(thumbnailSize, 10);

  if (parsedPreviewSize === undefined) {
    return url;
  }

  return coda.withQueryParams(url, {
    width: thumbnailSize,
    height: thumbnailSize,
    crop: 'center',
  });
}

/**
 * Some fields are not returned directly by the API but are derived from a
 * calculation on another field. Since the user may choose not to synchronize
 * this parent field, this function allows adding it according to a dependency
 * array defined next to the entity schema
 */
export function handleFieldDependencies(
  effectivePropertyKeys: Array<string>,
  fieldDependencies: Array<FieldDependency<any>> = []
) {
  fieldDependencies.forEach((def) => {
    if (
      def.dependencies.some(
        (key) => effectivePropertyKeys.includes(key) && !effectivePropertyKeys.includes(def.field as string)
      )
    ) {
      effectivePropertyKeys.push(def.field as string);
    }
  });

  return arrayUnique<string>(effectivePropertyKeys);
}

/**
 * Try to parse a json string, if it fails return the original value
 */
export function maybeParseJson(value: any) {
  if (!value) return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

export function arrayUnique<T = any>(array: T[]) {
  return Array.from(new Set(array));
}

export function logAdmin(msg: any) {
  if (IS_ADMIN_RELEASE) {
    console.log(msg);
  }
}

// Coda date to ISO Date helper
export function toIsoDate(convDate: Date): String {
  let isoDate = convDate.toISOString();
  return isoDate;
}

// ISO Date to Coda date helper
export function toCodaDate(isoDateToConv: String): String {
  let date = isoDateToConv.toString();
  let codaDate = new Date(date).toLocaleDateString('us');
  return codaDate;
}

export function compareByDisplayKey(a: any, b: any) {
  return a.display.localeCompare(b.display);
}
export function compareByValueKey(a: any, b: any) {
  return a.value.localeCompare(b.value);
}

/**
 * Sometimes, we will provide an input like `${name} (${id})`, formatted using formatOptionNameId()
 * This function parses the parameter value, extracting the ID from the
 * parenthesis, but also allows for cases where just the ID was passed in (via a
 * formula, etc).
 */
export function parseOptionId(label: string): number {
  if (!label) return undefined;
  if (!Number.isNaN(parseInt(label))) return Number(label);

  let match = label.match(/\((\d+)\)$/);
  if (!match) {
    throw new coda.UserVisibleError(`Invalid option: ${label}`);
  }
  return Number(match[1]);
}

export function formatOptionNameId(name: string, id: number): string {
  return `${trimStringWithEllipsis(name, 25)} (${id})`;
}

function trimStringWithEllipsis(inputString: string, maxLength: number) {
  if (inputString.length > maxLength) {
    return inputString.substring(0, maxLength - 1) + '…';
  }
  return inputString;
}

export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Checks if a value is nullish.
 * @param value The value to be checked for nullishness
 * @returns Returns true if the value is nullish; otherwise, returns false.
 */
export function isNullish(value: any) {
  return value === null || value === undefined;
}

/**
 * Checks if a value is defined but empty, taking into account all possible value types.
 * @param value The value to be checked for emptiness.
 * @returns Returns true if the value is empty; otherwise, returns false.
 */
export function isDefinedEmpty(value: any) {
  if (value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0 && !(value instanceof Date)) return true;

  return false;
}

/**
 * Checks if a value is nullish or empty, taking into account all possible value types.
 * @param value The value to be checked for nullishness or emptiness.
 * @returns Returns true if the value is nullish or empty; otherwise, returns false.
 */
export function isNullishOrEmpty(value: any) {
  return isNullish(value) || isDefinedEmpty(value);
}

export function formatPersonDisplayValue(person: {
  id: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  if (person.firstName || person.lastName) {
    return [person.firstName, person.lastName].filter((p) => p && p !== '').join(' ');
  } else if (person.email) {
    return person.email;
  }
  return person.id.toString();
}

export function formatAddressDisplayName(address, withName = true, withCompany = true) {
  const parts = [
    withName ? [address?.first_name, address?.last_name].filter((p) => p && p !== '').join(' ') : undefined,
    withCompany ? address?.company : undefined,
    address?.address1,
    address?.address2,
    address?.city,
    address?.country,
  ];

  return parts.filter((part) => part && part !== '').join(', ');
}

export function isObject(value: any) {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

/**
 * Takes an object and returns the key associated with the given value in the object
 * @param obj
 * @param value
 */
export function getKeyFromValue<T extends object>(obj: T, value: T[keyof T]): keyof T {
  return Object.keys(obj).find((key) => obj[key] === value) as keyof T;
}

// #region @shopify/hydrogen-react
export function flattenConnection(connection) {
  if (!connection) {
    const noConnectionErr = `flattenConnection(): needs a 'connection' to flatten, but received '${
      connection ?? ''
    }' instead.`;
    {
      console.error(noConnectionErr + ` Returning an empty array`);
      return [];
    }
  }
  if ('nodes' in connection) {
    return connection.nodes;
  }
  if ('edges' in connection && Array.isArray(connection.edges)) {
    return connection.edges.map((edge) => {
      if (!(edge == null ? void 0 : edge.node)) {
        throw new Error('flattenConnection(): Connection edges must contain nodes');
      }
      return edge.node;
    });
  }
  return [];
}

type ShopifyGid = Pick<URL, 'search' | 'searchParams' | 'hash'> & {
  id: string;
  resource: string | null;
  resourceId: string | null;
};
/**
 * Taken from @shopify/hydrogen-react
 // TODO: Need to find a way to replace URLSearchParams with another parser as URLSearchParams does not work with Coda
 *  maybe https://www.npmjs.com/package/url-parse ?
 */
function parseGid(gid: string | undefined): ShopifyGid {
  const defaultReturn = {
    id: '',
    resource: null,
    resourceId: null,
    search: '',
    searchParams: new URLSearchParams(),
    hash: '',
  };
  if (typeof gid !== 'string') {
    return defaultReturn;
  }
  try {
    const { search, searchParams, pathname, hash } = new URL(gid);
    const pathnameParts = pathname.split('/');
    const lastPathnamePart = pathnameParts[pathnameParts.length - 1];
    const resourcePart = pathnameParts[pathnameParts.length - 2];
    if (!lastPathnamePart || !resourcePart) {
      return defaultReturn;
    }
    const id = `${lastPathnamePart}${search}${hash}` || '';
    const resourceId = lastPathnamePart || null;
    const resource = resourcePart ?? null;
    return { id, resource, resourceId, search, searchParams, hash };
  } catch {
    return defaultReturn;
  }
}

/**
 * Filters out specific keys from an object and returns a new object with only
 * the remaining keys and their corresponding values.
 // TODO: better typing for the return
 * @param obj the object to filter
 * @param keysToFilterOut the keys we want to exclude
 */
export function filterObjectKeys<LolT extends Array<string>, ObjT>(obj: ObjT, keysToFilterOut: LolT): ObjT {
  return Object.keys(obj)
    .filter((key) => !keysToFilterOut.includes(key))
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {}) as ObjT;
}

// TODO: rewrite to handle nested objects
export function deleteUndefinedInObject<T>(obj: T) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) delete obj[key];
  });
  return obj;
}
// #endregion
