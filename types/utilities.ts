/**
 * Utility type to recursively remove readonly modifiers
 * from all properties of a type
 */
type Writeable<T> = { -readonly [P in keyof T]: T[P] };
type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

export type Stringified<T> = string & {
  [P in keyof T]: { '_ value': T[P] };
};
