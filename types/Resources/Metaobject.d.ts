import type * as AdminTypes from '../generated/admin.types';
import type { MetaobjectDefinitionFragment } from '../generated/admin.generated';

export type MetaobjectFragment = {
  /** A globally-unique ID. */
  id: AdminTypes.Scalars['ID']['output'];
  /** The unique handle of the object, useful as a custom ID. */
  handle: AdminTypes.Scalars['String']['output'];
  /** The type of the metaobject. */
  type: AdminTypes.Scalars['String']['output'];
  /** Metaobject capabilities for this Metaobject. */
  capabilities?: AdminTypes.MetaobjectCapabilityData;
  /** The MetaobjectDefinition that models this object type. */
  definition?: MetaobjectDefinitionFragment;
  /** When the object was last updated. */
  updatedAt: AdminTypes.Scalars['DateTime']['output'];
} & {
  /** metaobject custom fields. */
  [key: string]: {
    value: AdminTypes.Scalars['String']['output'];
    type: AdminTypes.Scalars['String']['output'];
    key: AdminTypes.Scalars['String']['output'];
  };
};
