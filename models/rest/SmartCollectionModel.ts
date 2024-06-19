// #region Imports
import * as coda from '@codahq/packs-sdk';

import { OrderSmartCollectionArgs, SmartCollectionClient } from '../../Clients/RestClients';
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
interface SmartCollectionRule {
  column: string;
  condition: string;
  relation: string;
}

export interface SmartCollectionApiData extends BaseApiDataRest {
  rules: Array<SmartCollectionRule> | null;
  title: string | null;
  body_html: string | null;
  disjunctive: boolean | null;
  handle: string | null;
  id: number | null;
  image: ImageApiData | null;
  published_at: string | null;
  published_scope: string | null;
  sort_order: string | null;
  template_suffix: string | null;
  updated_at: string | null;
}

export interface SmartCollectionModelData extends SmartCollectionApiData, BaseModelDataRestWithGraphQlMetafields {}
// #endregion

export class SmartCollectionModel extends AbstractModelRestWithGraphQlMetafields {
  public data: SmartCollectionModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Collection;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Collection;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Collection;
  protected static readonly graphQlName = GraphQlResourceNames.Collection;

  public static createInstanceFromRow(
    context: coda.ExecutionContext,
    { admin_url, image_alt_text, image_url, ...row }: CollectionRow
  ) {
    const data: Partial<SmartCollectionModelData> = {
      ...row,
      image: formatImageForData({ image_url, image_alt_text }),
      published_at: safeToString(row.published_at),
      rules: row.rules as SmartCollectionRule[],
      updated_at: safeToString(row.updated_at),
    };
    return this.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return SmartCollectionClient.createInstance(this.context);
  }

  public async order({ products, sort_order }: Omit<OrderSmartCollectionArgs, 'id'>) {
    const response = await this.client.order({ id: this.data.id, products, sort_order });
    if (response) this.setData(response.body);
  }

  public toCodaRow(): CollectionRow {
    return collectionModelToCodaRow(this.context, this.data as CollectionModelData);
  }
}
