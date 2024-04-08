import * as coda from '@codahq/packs-sdk';

export class RequiredParameterMissingVisibleError extends coda.UserVisibleError {
  constructor(message?: string) {
    super(`Required parameter missing: ${message}.`);
  }
}
