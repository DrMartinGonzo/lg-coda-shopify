import * as coda from '@codahq/packs-sdk';

/**
 * Type definition for the parameter used to pass in a batch of updates to a
 * sync table update function, without previousValues property.
 */
export interface SyncUpdateNoPreviousValues
  extends Omit<coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>, 'previousValue'> {}
