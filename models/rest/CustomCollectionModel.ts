// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CustomCollectionClient } from '../../Clients/RestApiClientBase';
import { SupportedMetafieldOwnerResource } from './MetafieldModel';
import { GraphQlResourceNames, RestResourcesSingular } from '../../Resources/types/SupportedResource';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { CollectionRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { BaseApiDataRest } from './AbstractModelRest';
import {
  AbstractModelRestWithGraphQlMetafields,
  BaseModelDataRestWithGraphQlMetafields,
} from './AbstractModelRestWithMetafields';
import { CollectionModelData } from '../../utils/collections-utils';
import { collectionModelToCodaRow } from '../../utils/collections-utils';
import { safeToString } from '../../utils/helpers';

// #endregion

// #region Types
export interface CustomCollectionApiData extends BaseApiDataRest {
  title: string | null;
  body_html: string | null;
  handle: string | null;
  id: number | null;
  admin_graphql_api_id: string | null;
  image: {
    src?: string;
    alt?: string;
  } | null;
  published: boolean | null;
  published_at: string | null;
  published_scope: string | null;
  sort_order: string | null;
  template_suffix: string | null;
  updated_at: string | null;
}

export interface CustomCollectionModelData extends CustomCollectionApiData, BaseModelDataRestWithGraphQlMetafields {}
// #endregion

export class CustomCollectionModel extends AbstractModelRestWithGraphQlMetafields<CustomCollectionModel> {
  public data: CustomCollectionModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Collection;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Collection;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Collection;
  protected static readonly graphQlName = GraphQlResourceNames.Collection;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: CollectionRow) {
    const data: Partial<CustomCollectionModelData> = {
      body_html: row.body_html,
      handle: row.handle,
      admin_graphql_api_id: row.admin_graphql_api_id,
      id: row.id,
      image: {
        src: row.image_url,
        alt: row.image_alt_text,
      },
      published: row.published,
      published_at: safeToString(row.published_at),
      published_scope: row.published_scope,
      sort_order: row.sort_order,
      template_suffix: row.template_suffix,
      title: row.title,
      updated_at: safeToString(row.updated_at),
    };
    return this.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return CustomCollectionClient.createInstance(this.context);
  }

  public toCodaRow(): CollectionRow {
    return collectionModelToCodaRow(this.context, this.data as CollectionModelData);
  }
}
