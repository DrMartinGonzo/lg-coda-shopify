// #region Imports
import * as coda from '@codahq/packs-sdk';

import { TranslatableContentClient } from '../../Clients/GraphQlApiClientBase';
import { GraphQlResourceNames } from '../types/SupportedResource';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { TranslatableContentRow } from '../../schemas/CodaRows.types';
import { TranslatableResourceType } from '../../types/admin.types';
import { graphQlGidToId } from '../../utils/conversion-utils';
import { AbstractModelGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export interface TranslatableContentApiData {
  locale: string;
  key: string;
  type: string;
  value: string;
  digest: string;
}

export interface TranslatableContentModelData
  extends Pick<TranslatableContentApiData, 'key' | 'type' | 'value'>,
    BaseModelDataGraphQl {
  resourceGid: string;
  resourceType: TranslatableResourceType;
}
// #endregion

export class TranslatableContentModel extends AbstractModelGraphQl {
  public data: TranslatableContentModelData;

  protected readonly primaryKey = 'fullId';
  public static readonly DELETED_SUFFIX = '&deleted=1';
  public static readonly displayName: Identity = PACK_IDENTITIES.TranslatableContent;
  protected static readonly graphQlName = GraphQlResourceNames.Translation;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: TranslatableContentRow) {
    let data: Partial<TranslatableContentModelData> = {};
    return TranslatableContentModel.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return TranslatableContentClient.createInstance(this.context);
  }

  get fullId() {
    if (this.data.resourceGid && this.data.key) {
      return `${this.data.resourceGid}?key=${this.data.key}`;
    }
    throw new Error('unable to get fullId');
  }

  public toCodaRow(): TranslatableContentRow {
    const { data, fullId } = this;

    let obj: Partial<TranslatableContentRow> = {
      id: fullId,
      key: data.key,
      value: data.value,
      resourceType: data.resourceType,
      resourceId: graphQlGidToId(data.resourceGid),
      // TODO
    };

    return obj as TranslatableContentRow;
  }
}
