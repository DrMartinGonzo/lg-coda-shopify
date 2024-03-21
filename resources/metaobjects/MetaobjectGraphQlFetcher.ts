import * as coda from '@codahq/packs-sdk';

import { ClientGraphQl } from '../../Fetchers/ClientGraphQl';
import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { GraphQlResponse, graphQlGidToId } from '../../helpers-graphql';
import { MetaobjectRow } from '../../schemas/CodaRows.types';
import { ResultOf, VariablesOf, readFragment } from '../../utils/graphql';
import { getThumbnailUrlFromFullUrl, isNullOrEmpty } from '../../utils/helpers';
import { Metaobject, metaobjectResource } from './metaobjectResource';
import { deleteMetaobjectMutation } from './metaobjects-graphql';
import { MetaobjectWithFields } from './Metaobject.types';
import { CUSTOM_FIELD_PREFIX_KEY } from '../../constants';
import { shouldUpdateSyncTableMetafieldValue } from '../metafields/metafields-helpers';
import { formatMetaFieldValueForSchema } from '../metafields/metafields-functions';

export class MetaobjectGraphQlFetcher extends ClientGraphQl<Metaobject> {
  constructor(context: coda.ExecutionContext) {
    super(metaobjectResource, context);
  }

  formatApiToRow(node: MetaobjectWithFields, schemaWithIdentity = false): MetaobjectRow {
    let obj = {
      id: graphQlGidToId(node.id),
      admin_graphql_api_id: node.id,
      handle: node.handle,
      admin_url: `${this.context.endpoint}/admin/content/entries/${node.type}/${graphQlGidToId(node.id)}`,
      status: node.capabilities?.publishable?.status,
      updatedAt: node.updatedAt,
    };

    if (node.capabilities?.publishable?.status) {
      obj.status = node.capabilities.publishable.status;
    }

    Object.keys(node)
      .filter(
        (key) =>
          key.indexOf(CUSTOM_FIELD_PREFIX_KEY) === 0 &&
          shouldUpdateSyncTableMetafieldValue(node[key].type, schemaWithIdentity)
      )
      .forEach((key) => {
        const prop = node[key];
        obj[prop.key] = formatMetaFieldValueForSchema({
          value: prop?.value,
          type: prop?.type,
        });
      });

    return obj;
  }

  // formatRowToApi(row: MetaobjectRow, metafieldKeyValueSets?: any[]) {
  //   const ret: VariablesOf<typeof UpdateMetaobject>['metaobjects'][0] = {
  //     id: row.id,
  //   };

  //   if (row.name !== undefined) {
  //     if (isNullOrEmpty(row.name)) {
  //       throw new coda.UserVisibleError("Metaobject name can't be empty");
  //     }
  //     ret.metaobjectname = row.name;
  //   }
  //   // alt is the only value that can be an empty string
  //   if (row.alt !== undefined) {
  //     ret.alt = row.alt;
  //   }

  //   // Means we have nothing to update
  //   if (Object.keys(ret).length <= 1) return undefined;
  //   return ret;
  // }

  // async fetch(metaobjectGid: string, requestOptions: FetchRequestOptions = {}) {
  //   const variables = {
  //     id: metaobjectGid,
  //     includeAlt: true,
  //     includeCreatedAt: true,
  //     includeDuration: true,
  //     includeMetaobjectSize: true,
  //     includeHeight: true,
  //     includeMimeType: true,
  //     includeThumbnail: true,
  //     includeUpdatedAt: true,
  //     includeUrl: true,
  //     includeWidth: true,
  //   } as VariablesOf<typeof querySingleMetaobject>;

  //   return this.makeRequest('fetchSingle', variables, requestOptions) as unknown as coda.FetchResponse<
  //     GraphQlResponse<{ node: ResultOf<typeof MetaobjectFieldsFragment> }>
  //   >;
  // }

  // async update(
  //   metaobjectUpdateInput: VariablesOf<typeof UpdateMetaobject>['metaobjects'],
  //   requestOptions: FetchRequestOptions = {}
  // ) {
  //   const variables = {
  //     metaobjects: metaobjectUpdateInput,
  //     includeAlt: true,
  //     includeCreatedAt: true,
  //     includeDuration: true,
  //     includeMetaobjectSize: true,
  //     includeHeight: true,
  //     includeMimeType: true,
  //     includeThumbnail: true,
  //     includeUpdatedAt: true,
  //     includeUrl: true,
  //     includeWidth: true,
  //   } as VariablesOf<typeof UpdateMetaobject>;

  //   return this.makeRequest('update', variables, requestOptions);
  // }

  /**
   * Delete metaobject with the given metaobject GID.
   * @param metaobjectGid - The GraphQL GID of the metaobject to delete.
   * @param requestOptions - The fetch request options. See {@link FetchRequestOptions}
   */
  async delete(metaobjectGid: string, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      id: metaobjectGid,
    } as VariablesOf<typeof deleteMetaobjectMutation>;

    return this.makeRequest('delete', variables, requestOptions);
  }
}
