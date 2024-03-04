import * as coda from '@codahq/packs-sdk';
import { DEFAULT_THUMBNAIL_SIZE } from './constants';
import { IS_ADMIN_RELEASE } from './pack-config.json';

import type { LengthUnit, WeightUnit } from './types/admin.types';
import type { FieldDependency } from './types/tableSync';
import type { ShopifyGraphQlError } from './types/ShopifyGraphQl';
import type { ShopifyGraphQlRequestCost } from './types/ShopifyGraphQl';

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
export function handleFieldDependencies(effectivePropertyKeys: string[], fieldDependencies: FieldDependency<any>[]) {
  fieldDependencies.forEach((def) => {
    if (
      def.dependencies.some(
        (key) => effectivePropertyKeys.includes(key) && !effectivePropertyKeys.includes(def.field as string)
      )
    ) {
      effectivePropertyKeys.push(def.field as string);
    }
  });

  return arrayUnique(effectivePropertyKeys);
}
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

export function wrapGetSchemaForCli(fn: coda.MetadataFunction, context: coda.ExecutionContext, args: any) {
  return fn(context, '', { ...args, __brand: 'MetadataContext' }) as Promise<coda.ArraySchema<coda.Schema>>;
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
 * @param {any} value - The value to be checked for nullishness or emptiness.
 * @returns {boolean} - Returns true if the value is nullish or empty; otherwise, returns false.
 */
export function isNullOrEmpty(value: any) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;

  return false;
}
