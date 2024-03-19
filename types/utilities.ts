/**
 * Utility type to recursively remove readonly modifiers
 * from all properties of a type
 */
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
