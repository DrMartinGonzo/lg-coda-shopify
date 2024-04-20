import * as coda from '@codahq/packs-sdk';

// #region User Visible Errors
export class RequiredParameterMissingVisibleError extends coda.UserVisibleError {
  constructor(message?: string) {
    super(`Required parameter missing: ${message}`);
  }
}

export class NotFoundVisibleError extends coda.UserVisibleError {
  constructor(name?: string) {
    super(`${name} not found.`);
  }
}

export class InvalidValueVisibleError extends coda.UserVisibleError {
  constructor(message?: string) {
    super(`Invalid value. ${message}`);
  }
}
// #endregion

// #region Internal Errors
export class UnsupportedValueError extends Error {
  constructor(name: string, value: any) {
    super(`Unknown or unsupported ${name}: ${JSON.stringify(value)}`);
  }
}

export class UnsupportedActionError extends Error {
  constructor(action: string) {
    super(`${action} is not supported`);
  }
}

export class InvalidValueError extends Error {
  constructor(name: string, value: any) {
    super(`Invalid ${name}. Value: ${JSON.stringify(value)}`);
  }
}

export class NotFoundError extends Error {
  constructor(name: string, msg?: string) {
    super(`${name} not found.${msg !== undefined ? ' ' + msg : ''}`);
  }
}

export class FormattingError extends Error {
  constructor(name: string, ...args: any[]) {
    super(`Unable to format ${name} with args: ${JSON.stringify(args)}`);
  }
}
// #endregion
