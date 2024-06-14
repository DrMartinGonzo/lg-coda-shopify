// #region Imports

import { AbstractRestClient, ArticleClient, BlogClient, PageClient } from '../../Clients/RestClients';
import { UnsupportedValueError } from '../../Errors/Errors';
import { MetafieldOwnerType } from '../../types/admin.types';
import { SupportedMetafieldOwnerType } from '../graphql/MetafieldGraphQlModel';
import { AbstractModelRestWithRestMetafields } from '../rest/AbstractModelRestWithMetafields';
import { ArticleModel } from '../rest/ArticleModel';
import { BlogModel } from '../rest/BlogModel';
import { PageModel } from '../rest/PageModel';

// #endregion

// TODO: Article, Page and Blog should use GraphQL metafields once GraphQl API version 2024-07 is stable
export const ownerTypeToRestClientMap = {
  [MetafieldOwnerType.Article]: ArticleClient,
  [MetafieldOwnerType.Blog]: BlogClient,
  [MetafieldOwnerType.Page]: PageClient,
} as const satisfies Partial<Record<SupportedMetafieldOwnerType, typeof AbstractRestClient<any, any, any, any>>>;

export function ownerTypeToRestClient(ownerType: SupportedMetafieldOwnerType) {
  const map = ownerTypeToRestClientMap;
  if (ownerType in map) return map[ownerType] as (typeof map)[keyof typeof map];
  throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
}

export function ownerTypeToRestModel(ownerType: SupportedMetafieldOwnerType) {
  const map: Partial<Record<SupportedMetafieldOwnerType, typeof AbstractModelRestWithRestMetafields>> = {
    [MetafieldOwnerType.Article]: ArticleModel,
    [MetafieldOwnerType.Blog]: BlogModel,
    [MetafieldOwnerType.Page]: PageModel,
  } as const satisfies Partial<Record<SupportedMetafieldOwnerType, typeof AbstractModelRestWithRestMetafields>>;

  if (ownerType in map) return map[ownerType] as (typeof map)[keyof typeof map];
  throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
}
