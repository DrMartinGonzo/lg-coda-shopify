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
 * Conditionally delays the next execution if the current availability is less
 * than the requested query cost or if there are any 'THROTTLED' errors.
 *
 * It calculates the waiting time based on the requested query cost, the
 * currently available capacity, and the restore rate, then applies the delay.
 *
 * @param {number} requestedQueryCost - The cost of the query being requested.
 * @param {number} currentlyAvailable - The current available capacity for executing queries.
 * @param {number} restoreRate - The rate at which the capacity is restored per second.
 * @param {Array} errors - The array of errors to check for a 'THROTTLED' code. Defaults to an empty array.
 */
export function maybeDelayNextExecution(
  requestedQueryCost: number,
  currentlyAvailable: number,
  restoreRate: number,
  errors = []
) {
  if (
    currentlyAvailable < requestedQueryCost ||
    (errors &&
      errors.length > 0 &&
      errors.some((error) => {
        return error.extensions?.code === 'THROTTLED';
      }))
  ) {
    const waitMs = ((requestedQueryCost - currentlyAvailable + restoreRate) / restoreRate) * 1000;
    console.log(`Delay next execution by ${waitMs}ms`);
    delay(waitMs);
  }
}
