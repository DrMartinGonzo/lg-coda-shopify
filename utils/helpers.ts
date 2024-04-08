import * as coda from '@codahq/packs-sdk';
// import slugify from 'slugify';

import { normalizeSchemaKey } from '@codahq/packs-sdk/dist/schema';
import { DEFAULT_THUMBNAIL_SIZE } from '../constants';
import { IS_ADMIN_RELEASE } from '../pack-config.json';
import { FieldDependency } from '../schemas/Schema.types';
import { LengthUnit, WeightUnit } from '../types/admin.types';

// export function slug(string: string) {
//   return slugify(string, {
//     replacement: '-', // replace spaces with replacement character, defaults to `-`
//     // remove: undefined, // remove characters that match regex, defaults to `undefined`
//     lower: true, // convert to lower case, defaults to `false`
//     strict: true, // strip special characters except replacement, defaults to `false`
//     trim: true, // trim leading and trailing replacement chars, defaults to `true`
//   });
// }

/**
 * Taken from Coda sdk
 */
export function transformToArraySchema(schema?: any) {
  if (schema?.type === coda.ValueType.Array) {
    return schema;
  } else {
    return {
      type: coda.ValueType.Array,
      items: schema,
    };
  }
}

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

export function getThumbnailUrlFromFullUrl(url: string, thumbnailSize = DEFAULT_THUMBNAIL_SIZE) {
  return coda.withQueryParams(url, {
    width: thumbnailSize,
    height: thumbnailSize,
    crop: 'center',
  });
}

/**
 * Delays the execution of subsequent code for a specified number of milliseconds.
 * Pack need to be executed/uploaded with --timerStrategy=fake flag for enable setTimeout shim
 *
 * @param {number} ms - The duration in milliseconds to wait
 */
export async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve('Rate limit wait'), ms);
  });
}

/**
 * Retrieve all object schema keys or fromKeys if present
 */
export function retrieveObjectSchemaEffectiveKeys<T extends ReturnType<typeof coda.makeObjectSchema>>(objectSchema: T) {
  const properties = objectSchema.properties;
  return Object.keys(properties).map((key) => getObjectSchemaEffectiveKey(objectSchema, key));
}

/**
 * Get a single object schema keys or fromKey if present
 */
export function getObjectSchemaEffectiveKey<T extends ReturnType<typeof coda.makeObjectSchema>>(
  objectSchema: T,
  key: string
) {
  const properties = objectSchema.properties;
  if (properties.hasOwnProperty(key)) {
    const property = properties[key];
    const propKey = property.hasOwnProperty('fromKey') ? property.fromKey : key;
    return propKey;
  }
  throw new Error(`Schema doesn't have ${key} property`);
}

export function getObjectSchemaNormalizedKey<T extends ReturnType<typeof coda.makeObjectSchema>>(
  objectSchema: T,
  fromKey: string
) {
  const properties = objectSchema.properties;
  let found = fromKey;
  Object.keys(properties).forEach((propKey) => {
    const property = properties[propKey];
    if (property.hasOwnProperty('fromKey') && property.fromKey === fromKey) {
      if (property.hasOwnProperty('fixedId')) {
        found = property.fixedId;
        return;
      }
    }
  });
  return normalizeSchemaKey(found);
}

const getShopifyAccessToken = (context: coda.ExecutionContext) => '{{token-' + context.invocationToken + '}}';
export const getShopifyRequestHeaders = (context: coda.ExecutionContext) => {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': getShopifyAccessToken(context),
  };
};
export const getShopifyStorefrontRequestHeaders = (context: coda.ExecutionContext) => {
  return {
    'Content-Type': 'application/json',
    'Shopify-Storefront-Private-Token': getShopifyAccessToken(context),
  };
};

/**
 * Some fields are not returned directly by the API but are derived from a
 * calculation on another field. Since the user may choose not to synchronize
 * this parent field, this function allows adding it according to a dependency
 * array defined next to the entity schema
 */
export function handleFieldDependencies(
  effectivePropertyKeys: Array<string>,
  fieldDependencies: Array<FieldDependency<any>>,
  forcedFields: Array<string> = []
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

  return arrayUnique(effectivePropertyKeys.concat(forcedFields));
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

export function isCodaCached(response: coda.FetchResponse<any>): boolean {
  return (!!response.headers['Coda-Fetcher-Cache-Hit'] && response.headers['Coda-Fetcher-Cache-Hit'] === '1') ?? false;
}

export function arrayUnique(array: any[]) {
  return Array.from(new Set(array));
}

export function logAdmin(msg: string) {
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
 * Checks if a value is nullish or empty, taking into account all possible value types.
 * @param value The value to be checked for nullishness or emptiness.
 * @returns Returns true if the value is nullish or empty; otherwise, returns false.
 */
export function isNullOrEmpty(value: any) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;

  return false;
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
// #endregion
