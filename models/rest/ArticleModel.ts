// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { ArticleClient } from '../../Clients/RestApiClientBase';
import { IMetafield } from '../../Resources/Mixed/MetafieldHelper';
import { SupportedMetafieldOwnerResource } from '../../Resources/Rest/Metafield';
import { GraphQlResourceNames, RestResourcesSingular } from '../../Resources/types/SupportedResource';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { ArticleRow } from '../../schemas/CodaRows.types';
import { formatBlogReference } from '../../schemas/syncTable/BlogSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { BaseApiDataRest, BaseModelDataRest } from './AbstractModelRest';
import {
  AbstractModelRestWithMetafields,
  BaseModelDataRestWithRestMetafields,
} from './AbstractModelRestWithMetafields';

// #endregion

// #region Types
export interface ArticleApiData extends BaseApiDataRest {
  author: string | null;
  blog_id: number | null;
  body_html: string | null;
  created_at: string | null;
  handle: string | null;
  id: number | null;
  admin_graphql_api_id: string | null;
  image: {
    src?: string;
    alt?: string;
  } | null;
  published: boolean | null;
  published_at: string | null;
  summary_html: string | null;
  tags: string | null;
  template_suffix: string | null;
  title: string | null;
  updated_at: string | null;
  user_id: number | null;
}

export interface ArticleModelData extends ArticleApiData, BaseModelDataRestWithRestMetafields {}
// #endregion

// TODO: convert to AbstractRestResourceWithGraphQLMetafields once GraphQl API version 2024-07 is stable
export class ArticleModel extends AbstractModelRestWithMetafields<ArticleModel> {
  public data: ArticleModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Article;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Article;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Article;
  protected static readonly graphQlName = GraphQlResourceNames.Article;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: ArticleRow) {
    const data: Partial<ArticleModelData> = {
      admin_graphql_api_id: row.admin_graphql_api_id,
      author: row.author,
      blog_id: row.blog?.id || row.blog_id,
      body_html: row.body_html,
      created_at: row.created_at ? row.created_at.toString() : undefined,
      handle: row.handle,
      id: row.id,
      image: {
        alt: row.image_alt_text,
        src: row.image_url,
      },
      published_at: row.published_at ? row.published_at.toString() : undefined,
      published: row.published,
      summary_html: row.summary_html,
      tags: row.tags,
      template_suffix: row.template_suffix,
      title: row.title,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,
      user_id: row.user_id,
    };
    return this.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return ArticleClient.createInstance(this.context);
  }

  public toCodaRow(): ArticleRow {
    const { metafields, ...data } = this.data;
    const obj: ArticleRow = {
      ...data,
      admin_url: `${this.context.endpoint}/admin/articles/${data.id}`,
      body: striptags(data.body_html),
      published: !!data.published_at,
      summary: striptags(data.summary_html),
    };

    if (data.blog_id) {
      obj.blog = formatBlogReference(data.blog_id);
    }

    if (data.image) {
      obj.image_alt_text = data.image.alt;
      obj.image_url = data.image.src;
    }

    if (metafields) {
      metafields.forEach((metafield: IMetafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
