// #region Imports

import * as coda from '@codahq/packs-sdk';

// #endregion

export interface FieldDependency<T extends coda.ObjectSchemaProperties> {
  field: keyof T | string;
  dependencies: (keyof T)[] | string[];
}

export type TypeFromCodaSchemaProps<PropsT extends Record<string, coda.Schema>> = {
  [K in keyof PropsT]: coda.SchemaType<PropsT[K]>;
};
