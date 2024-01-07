import * as coda from '@codahq/packs-sdk';
import { DEFAULT_THUMBNAIL_SIZE } from './constants';
import { ShopifyGraphQlError } from './shopifyErrors';
import { ShopifyGraphQlRequestCost } from './types/Shopify';
import { willThrottle, isThrottled } from './helpers-graphql';

export function isString(value: any) {
  return typeof value === 'string' || value instanceof String;
}

export function capitalizeFirstChar(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const convertTTCtoHT = (price, taxRate) => {
  return taxRate ? price / (1 + taxRate) : price;
};

export function unitToShortName(unit: string) {
  switch (unit) {
    // WEIGHT
    case 'GRAMS':
      return 'g';
    case 'KILOGRAMS':
      return 'kg';
    case 'OUNCES':
      return 'oz';
    case 'POUNDS':
      return 'lb';

    // LENGTH
    case 'CENTIMETERS':
      return 'cm';
    case 'FEET':
      return 'pi';
    case 'INCHES':
      return 'po';
    case 'METERS':
      return 'm';
    case 'MILLIMETERS':
      return 'mm';
    case 'YARDS':
      return 'yd';

    // VOLUME
    case 'MILLILITERS':
      return 'ml';
    case 'CENTILITERS':
      return 'cl';
    case 'LITERS':
      return 'l';
    case 'CUBIC_METERS':
      return 'm³';
    case 'FLUID_OUNCES':
      return 'oz liq.';
    case 'PINTS':
      return 'pt';
    case 'QUARTS':
      return 'qt';
    case 'GALLONS':
      return 'gal';
    case 'IMPERIAL_FLUID_OUNCES':
      return 'oz liq. imp.';
    case 'IMPERIAL_PINTS':
      return 'pt imp.';
    case 'IMPERIAL_QUARTS':
      return 'qt imp.';
    case 'IMPERIAL_GALLONS':
      return 'gal imp.';
  }

  return unit;
}

export function getThumbnailUrlFromFullUrl(url: string, size = DEFAULT_THUMBNAIL_SIZE) {
  return coda.withQueryParams(url, {
    width: size,
    height: size,
    crop: 'center',
  });
}

/**
 * Conditionally delays the next execution if the current availability is less
 * than the requested query cost or if there are any 'THROTTLED' errors.
 *
 * It calculates the waiting time based on the requested query cost, the
 * currently available capacity, and the restore rate, then applies the delay.
 *
 * @param cost - The cost property of the query being requested.
 * @param errors - The array of errors to check for a 'THROTTLED' code. Defaults to an empty array.
 */
export async function maybeDelayNextExecution(cost: ShopifyGraphQlRequestCost, errors: ShopifyGraphQlError[]) {
  const { requestedQueryCost } = cost;
  const { currentlyAvailable, restoreRate } = cost.throttleStatus;

  if (willThrottle(cost) || isThrottled(errors)) {
    const waitMs = ((requestedQueryCost - currentlyAvailable + restoreRate) / restoreRate) * 1000;
    console.log(`Delay next execution by ${waitMs}ms`);
    return wait(waitMs);
  }
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

const getShopifyAccessToken = (context) => {
  const invocationToken = context.invocationToken;
  return '{{token-' + invocationToken + '}}';
};
export const getShopifyRequestHeaders = (context) => {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': getShopifyAccessToken(context),
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

  // Return only unique values
  return Array.from(new Set(effectivePropertyKeys));
}
