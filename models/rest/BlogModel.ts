// #region Imports
import * as coda from '@codahq/packs-sdk';

import { BlogClient } from '../../Clients/RestClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames, RestResourcesSingular } from '../../constants/resourceNames-constants';
import { BlogRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { safeToString } from '../../utils/helpers';
import { formatMetafieldsForOwnerRow } from '../utils/metafields-utils';
import { BaseApiDataRest } from './AbstractModelRest';
import {
  AbstractModelRestWithRestMetafields,
  BaseModelDataRestWithRestMetafields,
} from './AbstractModelRestWithMetafields';
import { SupportedMetafieldOwnerResource } from './MetafieldModel';

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

export class BlogModel extends AbstractModelRestWithRestMetafields {
  public data: BlogModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Blog;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Blog;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Blog;
  protected static readonly graphQlName = GraphQlResourceNames.Blog;

  public static createInstanceFromRow(context: coda.ExecutionContext, { admin_url, ...row }: BlogRow) {
    const data: Partial<BlogModelData> = {
      ...row,
      created_at: safeToString(row.created_at),
      updated_at: safeToString(row.updated_at),
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
    const { metafields = [], ...data } = this.data;
    const obj: BlogRow = {
      ...data,
      admin_url: `${this.context.endpoint}/admin/blogs/${data.id}`,
      ...formatMetafieldsForOwnerRow(metafields),
    };

    return obj as BlogRow;
  }
}
