import * as coda from '@codahq/packs-sdk';
import { DEFAULT_THUMBNAIL_SIZE, IS_ADMIN_RELEASE } from './constants';
import { ShopifyGraphQlError } from './shopifyErrors';
import { ShopifyGraphQlRequestCost } from './types/ShopifyGraphQlErrors';
import { LengthUnit, WeightUnit } from './types/admin.types';

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

const weightUnitsMap: { [key in WeightUnit]: string } = {
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

export function getThumbnailUrlFromFullUrl(url: string, size = DEFAULT_THUMBNAIL_SIZE) {
  return coda.withQueryParams(url, {
    width: size,
    height: size,
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
 * Get an object Schema item property by its key name or its fromKey property
 * @param objectSchema
 * @param key property key or fromKey property
 * @returns schema property
 */
export function getObjectSchemaItemProp(objectSchema, key: string) {
  const properties = objectSchema.items.properties;
  for (const currKey of Object.keys(properties)) {
    const prop = properties[currKey];
    if (currKey === key) return prop;
    if (prop.fromKey && prop.fromKey === key) return prop;
  }
}

const getShopifyAccessToken = (context) => '{{token-' + context.invocationToken + '}}';
export const getShopifyRequestHeaders = (context) => {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': getShopifyAccessToken(context),
  };
};
export const getShopifyStorefrontRequestHeaders = (context) => {
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
  effectivePropertyKeys: string[],
  fieldDependencies: {
    field: string;
    dependencies: string[];
  }[]
) {
  fieldDependencies.forEach((def) => {
    if (
      def.dependencies.some((key) => effectivePropertyKeys.includes(key) && !effectivePropertyKeys.includes(def.field))
    ) {
      effectivePropertyKeys.push(def.field);
    }
  });

  return arrayUnique(effectivePropertyKeys);
}
}

/**
 * Try to parse a json string, if it fails return the original value
 */
export function maybeParseJson(value) {
  if (!value) return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

export function isCodaCached(response: coda.FetchResponse<any>): boolean {
  return (response.headers['Coda-Fetcher-Cache-Hit'] && response.headers['Coda-Fetcher-Cache-Hit'] === '1') ?? false;
}

export function arrayUnique(array: any[]) {
  return Array.from(new Set(array));
}

export function wrapGetSchemaForCli(fn: coda.MetadataFunction, context: coda.ExecutionContext, args: any) {
  return fn(context, undefined, { ...args, __brand: 'MetadataContext' }) as Promise<coda.ArraySchema<coda.Schema>>;
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
