// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { BlogClient } from '../../Clients/RestApiClientBase';
import { IMetafield } from '../../Resources/Mixed/MetafieldHelper';
import { SupportedMetafieldOwnerResource } from '../../Resources/Rest/Metafield';
import { GraphQlResourceNames, RestResourcesSingular } from '../../Resources/types/SupportedResource';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { BlogRow } from '../../schemas/CodaRows.types';
import { formatBlogReference } from '../../schemas/syncTable/BlogSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { BaseApiDataRest, BaseModelDataRest } from './AbstractModelRest';
import {
  AbstractModelRestWithMetafields,
  BaseModelDataRestWithRestMetafields,
} from './AbstractModelRestWithMetafields';

// #endregion

// #region Types
export interface BlogApiData extends BaseApiDataRest {
  admin_graphql_api_id: string | null;
  commentable: string | null;
  created_at: string | null;
  feedburner: string | null;
  feedburner_location: string | null;
  handle: string | null;
  id: number | null;
  tags: string | null;
  template_suffix: string | null;
  title: string | null;
  updated_at: string | null;
}

export interface BlogModelData extends BlogApiData, BaseModelDataRestWithRestMetafields {}
// #endregion

// TODO: convert to AbstractRestResourceWithGraphQLMetafields once GraphQl API version 2024-07 is stable
export class BlogModel extends AbstractModelRestWithMetafields<BlogModel> {
  public data: BlogModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Blog;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Blog;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Blog;
  protected static readonly graphQlName = GraphQlResourceNames.Blog;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: BlogRow) {
    const data: Partial<BlogModelData> = {
      admin_graphql_api_id: row.admin_graphql_api_id,
      commentable: row.commentable,
      created_at: row.created_at ? row.created_at.toString() : undefined,
      handle: row.handle,
      id: row.id,
      tags: row.tags,
      template_suffix: row.template_suffix,
      title: row.title,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,
    };
    return this.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return BlogClient.createInstance(this.context);
  }

  public toCodaRow(): BlogRow {
    const { metafields, ...data } = this.data;
    const obj: BlogRow = {
      ...data,
      admin_url: `${this.context.endpoint}/admin/blogs/${data.id}`,
    };

    if (metafields) {
      metafields.forEach((metafield: IMetafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
