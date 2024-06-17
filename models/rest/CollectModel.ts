// #region Imports
import * as coda from '@codahq/packs-sdk';

import { CollectClient } from '../../Clients/RestClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { CollectRow } from '../../schemas/CodaRows.types';
import { formatCollectionReference } from '../../schemas/syncTable/CollectionSchema';
import { formatProductReference } from '../../schemas/syncTable/ProductSchema';
import { safeToString } from '../../utils/helpers';
import { AbstractModelRest, BaseApiDataRest } from './AbstractModelRest';
import { BaseModelDataRestWithRestMetafields } from './AbstractModelRestWithMetafields';

// #endregion

// #region Types
export interface CollectApiData extends BaseApiDataRest {
  collection_id: number | null;
  created_at: string | null;
  id: number | null;
  position: number | null;
  product_id: number | null;
  sort_value: string | null;
  updated_at: string | null;
}

export interface CollectModelData extends CollectApiData, BaseModelDataRestWithRestMetafields {}
// #endregion

export class CollectModel extends AbstractModelRest {
  public data: CollectModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Collect;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: CollectRow) {
    const data: Partial<CollectModelData> = {
      collection_id: row.collection_id,
      created_at: safeToString(row.created_at),
      id: row.id,
      position: row.position,
      product_id: row.product_id,
      updated_at: safeToString(row.updated_at),
    };
    return this.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return CollectClient.createInstance(this.context);
  }

  public toCodaRow(): CollectRow {
    const { data } = this;
    const obj: CollectRow = {
      ...data,
    };

    if (data.collection_id) {
      obj.collection = formatCollectionReference(data.collection_id);
    }
    if (data.product_id) {
      obj.product = formatProductReference(data.product_id);
    }

    return obj as CollectRow;
  }
}
