import { ExecutionContext } from '@codahq/packs-sdk';

export interface FormatFunction {
  (data: any, context?: ExecutionContext): any;
}
