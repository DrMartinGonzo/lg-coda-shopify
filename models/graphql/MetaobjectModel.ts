// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../../utils/tada-utils';

import { MetaobjectClient } from '../../Clients/GraphQlApiClientBase';
import { GraphQlResourceNames } from '../../Resources/types/SupportedResource';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { metaobjectFragment } from '../../graphql/metaobjects-graphql';
import { MetaobjectRow } from '../../schemas/CodaRows.types';
import { MetaobjectStatus } from '../../types/admin.types';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { isNullishOrEmpty } from '../../utils/helpers';
import { formatMetaFieldValueForSchema, shouldUpdateSyncTableMetafieldValue } from '../../utils/metafields-utils';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export type MetaobjectApiData = BaseApiDataGraphQl & ResultOf<typeof metaobjectFragment>;
export type MetaobjectFieldApiData = MetaobjectApiData['fields'][number];

export interface MetaobjectModelData extends MetaobjectApiData, BaseModelDataGraphQl {}
// #endregion

export class MetaobjectModel extends AbstractModelGraphQl<MetaobjectModel> {
  public data: MetaobjectModelData;
  // TODO: rename ?
  public metaobjectFieldFromKeys: string[];
  public metaobjectFieldFromKeysValues: {
    fromKey: string;
    value: string;
  }[];

  public static readonly displayName: Identity = PACK_IDENTITIES.Metaobject;
  protected static readonly graphQlName = GraphQlResourceNames.Metaobject;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: MetaobjectRow) {
    let data: Partial<MetaobjectModelData> = {
      id: idToGraphQlGid(GraphQlResourceNames.Metaobject, row.id),
      updatedAt: row.updated_at ? row.updated_at.toString() : undefined,
      // fields: metaobjectFields,
      type: row.type,
      handle: isNullishOrEmpty(row.handle) ? undefined : row.handle,
      capabilities: isNullishOrEmpty(row.status)
        ? undefined
        : { publishable: { status: row.status as MetaobjectStatus } },
    };

    const instance = MetaobjectModel.createInstance(context, data);

    const metaobjectFieldFromKeys = Object.keys(row).filter((key) => !['id', 'handle', 'status'].includes(key));
    instance.metaobjectFieldFromKeys = metaobjectFieldFromKeys;
    instance.metaobjectFieldFromKeysValues = metaobjectFieldFromKeys.map((fromKey) => ({
      fromKey: fromKey,
      value: row[fromKey] as string,
    }));

    return instance;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return MetaobjectClient.createInstance(this.context);
  }

  public toCodaRow(): MetaobjectRow {
    const { data } = this;

    let obj: Partial<MetaobjectRow> = {
      id: this.restId,
      admin_graphql_api_id: this.graphQlGid,
      handle: data.handle,
      admin_url: `${this.context.endpoint}/admin/content/entries/${data.type}/${this.restId}`,
      status: data.capabilities?.publishable?.status,
      updatedAt: data.updatedAt,
    };

    if (data.capabilities?.publishable?.status) {
      obj.status = data.capabilities.publishable.status;
    }

    if (data.fields.length) {
      data.fields
        .filter((field) => shouldUpdateSyncTableMetafieldValue(field.type))
        .forEach((field) => {
          obj[field.key] = formatMetaFieldValueForSchema({
            value: field.value,
            type: field.type,
          });
        });
    }

    return obj as MetaobjectRow;
  }
}
