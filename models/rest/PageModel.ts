// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';

import { PageClient } from '../../Clients/RestApiClientBase';
import { IMetafield } from '../../Resources/Mixed/MetafieldHelper';
import { SupportedMetafieldOwnerResource } from '../../Resources/Rest/Metafield';
import { GraphQlResourceNames, RestResourcesSingular } from '../../Resources/types/SupportedResource';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { PageRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { BaseApiDataRest } from './AbstractModelRest';
import {
  AbstractModelRestWithMetafields,
  BaseModelDataRestWithRestMetafields,
} from './AbstractModelRestWithMetafields';

// #endregion

// #region Types
export interface PageApiData extends BaseApiDataRest {
  admin_graphql_api_id: string | null;
  author: string | null;
  body_html: string | null;
  created_at: string | null;
  handle: string | null;
  id: number | null;
  published_at: string | null;
  shop_id: number | null;
  template_suffix: string | null;
  title: string | null;
  updated_at: string | null;
}

export interface PageModelData extends PageApiData, BaseModelDataRestWithRestMetafields {}
// #endregion

// TODO: convert to AbstractRestResourceWithGraphQLMetafields once GraphQl API version 2024-07 is stable
export class PageModel extends AbstractModelRestWithMetafields<PageModel> {
  public data: PageModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Page;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Page;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Page;
  protected static readonly graphQlName = GraphQlResourceNames.Page;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: PageRow) {
    const data: Partial<PageModelData> = {
      id: row.id,
      author: row.author,
      body_html: row.body_html,
      handle: row.handle,
      published_at: row.published_at ? row.published_at.toString() : undefined,
      title: row.title,
      template_suffix: row.template_suffix,
      admin_graphql_api_id: row.admin_graphql_api_id,
      created_at: row.created_at ? row.created_at.toString() : undefined,
      updated_at: row.updated_at ? row.updated_at.toString() : undefined,
    };
    return this.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return PageClient.createInstance(this.context);
  }

  public toCodaRow(): PageRow {
    const { metafields, ...data } = this.data;
    const obj: PageRow = {
      ...data,
      admin_url: `${this.context.endpoint}/admin/pages/${data.id}`,
      body: striptags(data.body_html),
      published: !!data.published_at,
    };

    if (!!data.published_at && data.handle) {
      obj.shop_url = `${this.context.endpoint}/pages/${data.handle}`;
    }

    if (metafields) {
      metafields.forEach((metafield: IMetafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj;
  }
}
