import type * as AdminTypes from '../../types/admin.types';
import { ResultOf } from '../../utils/graphql';
import { MetaobjectDefinitionFragment } from './metaobjects-graphql';

export type MetaobjectWithFields = Omit<AdminTypes.Metaobject, 'definition'> & {
  /** The MetaobjectDefinition that models this object type. */
  definition?: ResultOf<typeof MetaobjectDefinitionFragment>;
} & {
  /** Metaobject custom fields. */
  [key: string]: {
    /** Metaobject custom field value. */
    value: string;
    /** Metaobject custom field type. */
    type: string;
    /** Metaobject custom field key. */
    key: string;
  };
};
