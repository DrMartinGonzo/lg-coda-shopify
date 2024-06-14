// #region Imports
import { ResultOf } from '../../graphql/utils/graphql-utils';

import { metaobjectDefinitionFragment } from '../../graphql/metaobjectDefinition-graphql';
import { BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export type MetaobjectDefinitionApiData = BaseApiDataGraphQl & ResultOf<typeof metaobjectDefinitionFragment>;

export interface MetaobjectDefinitionModelData extends MetaobjectDefinitionApiData, BaseModelDataGraphQl {}
// #endregion
