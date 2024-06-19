// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CustomCollectionClient } from '../../Clients/RestClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames, RestResourcesSingular } from '../../constants/resourceNames-constants';
import { CollectionRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { safeToString } from '../../utils/helpers';
import { CollectionModelData, collectionModelToCodaRow } from '../utils/collections-utils';
import { formatImageForData } from '../utils/restModel-utils';
import { BaseApiDataRest, ImageApiData } from './AbstractModelRest';
import {
  AbstractModelRestWithGraphQlMetafields,
  BaseModelDataRestWithGraphQlMetafields,
} from './AbstractModelRestWithMetafields';
import { SupportedMetafieldOwnerResource } from './MetafieldModel';

// #endregion

// #region Types
export interface CustomCollectionApiData extends BaseApiDataRest {
  title: string | null;
  body_html: string | null;
  handle: string | null;
  id: number | null;
  admin_graphql_api_id: string | null;
  image: ImageApiData | null;
  published: boolean | null;
  published_at: string | null;
  published_scope: string | null;
  sort_order: string | null;
  template_suffix: string | null;
  updated_at: string | null;
}

export interface CustomCollectionModelData extends CustomCollectionApiData, BaseModelDataRestWithGraphQlMetafields {}
// #endregion

export class CustomCollectionModel extends AbstractModelRestWithGraphQlMetafields {
  public data: CustomCollectionModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Collection;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Collection;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Collection;
  protected static readonly graphQlName = GraphQlResourceNames.Collection;

  public static createInstanceFromRow(
    context: coda.ExecutionContext,
    { admin_url, image_url, image_alt_text, ...row }: CollectionRow
  ) {
    const data: Partial<CustomCollectionModelData> = {
      ...row,
      image: formatImageForData({ image_url, image_alt_text }),
      published_at: safeToString(row.published_at),
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
