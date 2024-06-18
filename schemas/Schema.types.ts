// #region Imports

import * as coda from '@codahq/packs-sdk';

// #endregion

export interface FieldDependency<T extends coda.ObjectSchemaProperties> {
  field: keyof T | string;
  dependencies: (keyof T)[] | string[];
}

export type TypeFromCodaSchema<SchemaT extends ReturnType<typeof coda.makeObjectSchema>> = {
  [K in keyof SchemaT['properties']]: coda.SchemaType<SchemaT['properties'][K]>;
};
