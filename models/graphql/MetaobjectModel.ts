// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, idToGraphQlGid } from '../../graphql/utils/graphql-utils';

import { MetaobjectClient } from '../../Clients/GraphQlClients';
import { CodaMetafieldValue } from '../../coda/CodaMetafieldValue';
import { Identity, PACK_IDENTITIES } from '../../constants/pack-constants';
import { GraphQlResourceNames } from '../../constants/resourceNames-constants';
import { metaobjectFragment } from '../../graphql/metaobjects-graphql';
import { MetaobjectRow } from '../../schemas/CodaRows.types';
import { MetaobjectStatus } from '../../types/admin.types';
import { isNullishOrEmpty, isString, safeToString } from '../../utils/helpers';
import { formatMetaFieldValueForSchema, shouldUpdateSyncTableMetafieldValue } from '../utils/metafields-utils';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';

// #endregion

// #region Types
export interface MetaobjectApiData extends BaseApiDataGraphQl, ResultOf<typeof metaobjectFragment> {}
export type MetaobjectFieldApiData = MetaobjectApiData['fields'][number];

export interface MetaobjectModelData extends MetaobjectApiData, BaseModelDataGraphQl {}
// #endregion

export class MetaobjectModel extends AbstractModelGraphQl {
  public data: MetaobjectModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Metaobject;
  protected static readonly graphQlName = GraphQlResourceNames.Metaobject;

  public static createInstanceFromRow(context: coda.ExecutionContext, { admin_url, ...row }: MetaobjectRow) {
    let data: Partial<MetaobjectModelData> = {
      id: idToGraphQlGid(GraphQlResourceNames.Metaobject, row.id),
      updatedAt: safeToString(row.updated_at),
      // must be set via setCustomFields
      fields: [],
      type: row.type,
      handle: isNullishOrEmpty(row.handle) ? undefined : row.handle,
      capabilities: isNullishOrEmpty(row.status)
        ? undefined
        : { publishable: { status: row.status as MetaobjectStatus } },
    };

    return MetaobjectModel.createInstance(context, data);
  }

  public static parseCustomFieldsFromVarArgs(varargs: Array<any>): MetaobjectFieldApiData[] {
    const fields: MetaobjectFieldApiData[] = [];
    while (varargs.length > 0) {
      let key: string, value: string;
      [key, value, ...varargs] = varargs;
      /**
       * Check if the user used one the `Meta{…}` helper formulas
       * If not, assume the user directly input the expected value and let Shopify GraphQL handle the possible error
       */
      try {
        const maybeCodaMetafieldValue = CodaMetafieldValue.createFromCodaParameter(value);
        value = maybeCodaMetafieldValue.value;
      } catch (error) {}

      fields.push({
        key,
        // value should always be a string
        value: isNullishOrEmpty(value) ? '' : isString(value) ? value : JSON.stringify(value),
        /**
         * We don't care about the type since
         * parseMetaobjectFieldInputsFromVarArgs is only used for
         * creating/updating and type is not needed for these mutations
         */
        type: undefined,
      });
    }
    return fields;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return MetaobjectClient.createInstance(this.context);
  }

  public setCustomFields(fields: MetaobjectFieldApiData[]) {
    this.data.fields = fields;
  }

  public toCodaRow(): MetaobjectRow {
    const { fields, ...data } = this.data;

    let obj: Partial<MetaobjectRow> = {
      id: this.restId,
      admin_graphql_api_id: this.graphQlGid,
      handle: data.handle,
      admin_url: `${this.context.endpoint}/admin/content/entries/${data.type}/${this.restId}`,
      status: data.capabilities?.publishable?.status,
      updatedAt: data.updatedAt,
    };

    if (fields && fields.length) {
      fields
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
