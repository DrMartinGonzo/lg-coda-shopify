import * as coda from '@codahq/packs-sdk';

type ShopifyGraphQlUserError = {
  field: string[];
  code: string;
  message: string;
};
type ShopifyGraphQlError = {
  locations: {
    line: number;
    column: number;
  }[];
  message: string;
  path?: string[];
  extensions?: {
    code: string;
    typeName: string;
    fieldName: string;
  };
};
type ShopifyGraphQlRequestCost = {
  requestedQueryCost: number;
  actualQueryCost: number;
  throttleStatus: {
    maximumAvailable: number;
    currentlyAvailable: number;
    restoreRate: number;
  };
};

export function capitalizeFirstChar(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const convertTTCtoHT = (price, taxRate) => {
  return taxRate ? price / (1 + taxRate) : price;
};

export const getTokenPlaceholder = (context) => {
  const invocationToken = context.invocationToken;
  return '{{token-' + invocationToken + '}}';
};

export const extractNextUrlPagination = (response) => {
  let nextUrl;
  const link = response.headers.link;
  if (link) {
    const parts = link.split(',');
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      if (part.indexOf('next') !== -1) {
        nextUrl = part.split(';')[0].trim().slice(1, -1);
        break;
      }
    }
  }

  return nextUrl;
};

export const cleanQueryParams = (params) => {
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined) {
      delete params[key];
    }
  });

  return params;
};

export function handleGraphQlUserError(userErrors: ShopifyGraphQlUserError[]) {
  // Abort if no errors
  if (!userErrors || !userErrors.length) return;

  const errorMsg = userErrors.map((error) => `• ${error.code}\n${error.message}`).join('\n\n');
  throw new coda.UserVisibleError(errorMsg);
}
export function handleGraphQlError(errors: ShopifyGraphQlError[]) {
  // Abort if no errors or throttled errors
  if (!errors || !errors.length || isThrottled(errors)) return;

  const errorMsg = errors.map((error) => `• ${error.message}`).join('\n\n');
  throw new coda.UserVisibleError(errorMsg);
}

/**
 * Delays the execution of subsequent code for a specified number of milliseconds.
 *
 * This is a blocking delay function that uses a busy wait loop to halt the execution
 * for the given duration. It should be noted that this will also block the event loop
 * and should generally be avoided in favor of non-blocking alternatives like `setTimeout`.
 *
 * @param {number} ms - The duration in milliseconds for which to delay execution.
 */
export function delay(ms: number): void {
  const date = Date.now();
  let currentDate = null;

  do {
    currentDate = Date.now();
  } while (currentDate - date < ms);
}

/**
 * Check if the available capacity for next execution is less than the requested
 * query cost.
 *
 * @param cost - The cost property of the query being requested.
 */
export function willThrottle(cost: ShopifyGraphQlRequestCost) {
  return cost.throttleStatus.currentlyAvailable < cost.requestedQueryCost;
}

/**
 * Check if there are any 'THROTTLED' errors.
 *
 * @param errors - The array of errors to check for a 'THROTTLED' code. Defaults to an empty array.
 */
export function isThrottled(errors: ShopifyGraphQlError[]) {
  return errors && errors.length && errors.some((error) => error.extensions?.code === 'THROTTLED');
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
export function maybeDelayNextExecution(cost: ShopifyGraphQlRequestCost, errors: ShopifyGraphQlError[]) {
  const { requestedQueryCost } = cost;
  const { currentlyAvailable, restoreRate } = cost.throttleStatus;

  if (willThrottle(cost) || isThrottled(errors)) {
    const waitMs = ((requestedQueryCost - currentlyAvailable + restoreRate) / restoreRate) * 1000;
    console.log(`Delay next execution by ${waitMs}ms`);
    delay(waitMs);
  }
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

export function graphQlIdToId(graphQlId: string) {
  return graphQlId.split('/').pop();
}

export const getGraphQlHeaders = (context) => {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': getTokenPlaceholder(context),
  };
};
export async function graphQlRequest(
  context: coda.ExecutionContext,
  payload: any,
  cacheTtlSecs?: number,
  apiVersion: string = '2023-04'
) {
  const options: coda.FetchRequest = {
    method: 'POST',
    url: `${context.endpoint}/admin/api/${apiVersion}/graphql.json`,
    headers: getGraphQlHeaders(context),
    body: JSON.stringify(payload),
  };
  if (cacheTtlSecs !== undefined) {
    options.cacheTtlSecs = cacheTtlSecs;
  }

  return context.fetcher.fetch(options);
}
