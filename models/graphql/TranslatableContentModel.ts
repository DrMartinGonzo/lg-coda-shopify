// #region Imports

import { TranslatableContentClient } from '../../Clients/GraphQlClients';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { NOT_SUPPORTED } from '../../constants/strings-constants';
import { graphQlGidToId } from '../../graphql/utils/graphql-utils';
import { TranslatableContentRow } from '../../schemas/CodaRows.types';
import { TranslatableResourceType } from '../../types/admin.types';
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

  public static createInstanceFromRow(): InstanceType<typeof this> {
    throw new Error(NOT_SUPPORTED);
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
    const { fullId } = this;
    const { resourceGid, ...data } = this.data;

    let obj: Partial<TranslatableContentRow> = {
      ...data,
      id: fullId,
      resourceId: graphQlGidToId(resourceGid),
      // TODO
    };

    return obj as TranslatableContentRow;
  }
}
