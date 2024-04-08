import * as coda from '@codahq/packs-sdk';

import { GraphQlFetchResponse, SyncTableGraphQl } from '../../Fetchers/SyncTableGraphQl';
import { SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import { GRAPHQL_NODES_LIMIT, TYPE_AND_OWNER_ID_REQUIRED } from '../../constants';
import { MetafieldRow } from '../../schemas/CodaRows.types';
import { VariablesOf, readFragmentArray } from '../../utils/graphql';
import { MetafieldFragmentWithDefinition, MetafieldOwnerNode } from './Metafield.types';
import { MetafieldGraphQlFetcher } from './MetafieldGraphQlFetcher';
import { Metafield, metafieldResource } from './metafieldResource';
import { Sync_Metafields } from './metafields-coda';
import {
  ResourceMetafieldsByKeysQueriesUnion,
  getResourceMetafieldsByKeysQueryFromOwnerType,
  metafieldFieldsFragmentWithDefinition,
} from './metafields-graphql';
import { formatMetafieldSyncTableValueForApi } from './metafields-functions';
import { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { idToGraphQlGid } from '../../helpers-graphql';
import { MetafieldTypeValue } from './metafields-constants';
import { MetafieldOwnerType } from '../../types/admin.types';
import { ResourceWithMetafields } from '../Resource.types';

export class MetafieldGraphQlSyncTable extends SyncTableGraphQl<Metafield> {
  constructor(fetcher: MetafieldGraphQlFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(metafieldResource, fetcher, params);
    this.initalMaxEntriesPerRun = GRAPHQL_NODES_LIMIT;
  }

  setPayload(): void {
    const [metafieldKeysParam] = this.codaParams as SyncTableParamValues<typeof Sync_Metafields>;
    const filteredMetafieldKeys = Array.isArray(metafieldKeysParam)
      ? metafieldKeysParam.filter((key) => key !== undefined && key !== '')
      : [];

    const ownerResource = (this.fetcher as MetafieldGraphQlFetcher).ownerResource;
    const documentNode = getResourceMetafieldsByKeysQueryFromOwnerType(ownerResource.metafields.ownerType);

    this.documentNode = documentNode;
    this.variables = {
      maxEntriesPerRun: this.maxEntriesPerRun,
      cursor: this.prevContinuation?.cursor ?? null,
      metafieldKeys: filteredMetafieldKeys,
      countMetafields: filteredMetafieldKeys.length ? filteredMetafieldKeys.length : GRAPHQL_NODES_LIMIT,
    } as VariablesOf<typeof documentNode>;
  }

  handleSyncTableResponse = (
    response: GraphQlFetchResponse<ResourceMetafieldsByKeysQueriesUnion>
  ): Array<MetafieldRow> => {
    if (response?.body?.data) {
      let ownerNodes: Array<MetafieldOwnerNode> = [];
      if ('shop' in response.body.data) {
        ownerNodes = response.body.data.shop ? [response.body.data.shop] : [];
      } else {
        const key = Object.keys(response.body.data)[0];
        ownerNodes = response.body.data[key]?.nodes ? response.body.data[key].nodes : [];
      }

      return ownerNodes
        .map((ownerNode) => {
          const metafieldNodes = readFragmentArray(metafieldFieldsFragmentWithDefinition, ownerNode.metafields.nodes);
          return metafieldNodes.map((metafieldNode) =>
            (this.fetcher as MetafieldGraphQlFetcher).formatApiToRow(metafieldNode, ownerNode)
          );
        })
        .flat()
        .filter(Boolean);
    }

    return [] as Array<MetafieldRow>;
  };

  async executeUpdate(updates: Array<coda.SyncUpdate<string, string, Metafield['schema']>>) {
    const jobs = updates.map(async (update) => {
      // 'type' and 'owner_id' are required for the update to work
      if (update.previousValue.owner_id === undefined || update.previousValue.type === undefined) {
        throw new coda.UserVisibleError(TYPE_AND_OWNER_ID_REQUIRED);
      }

      const { type, owner_id } = update.previousValue;
      const value = await formatMetafieldSyncTableValueForApi(update, this.context);
      const fullKey = update.previousValue.label as string;
      const metafieldKeyValueSet: CodaMetafieldKeyValueSet = {
        key: fullKey,
        value,
        type: type as MetafieldTypeValue,
      };
      const metafieldGraphQlFetcher = new MetafieldGraphQlFetcher(ownerResource, context);
      const ownerGid = idToGraphQlGid(ownerResource.graphQl.name, owner_id);

      const { deletedMetafields, updatedMetafields } = await metafieldGraphQlFetcher.createUpdateDelete(ownerGid, [
        metafieldKeyValueSet,
      ]);
      if (updatedMetafields.length) {
        return {
          ...update.previousValue,
          ...metafieldGraphQlFetcher.formatApiToRow(updatedMetafields[0] as MetafieldFragmentWithDefinition, {
            id: idToGraphQlGid(ownerResource.graphQl.name, owner_id),
          }),
        };
      } else if (deletedMetafields.length) {
        /**
         * We only return these keys so that they are not erased from the sync
         * table in order to be able to recreate the metafield without having to
         * use a button (as long as other sync is not started)
         */
        const { id, label, owner_id, type, owner } = update.previousValue;
        return {
          id,
          label,
          owner_id,
          type,
          owner,
        };
      }
    });

    const completed = await Promise.allSettled(jobs);
    return {
      result: completed.map((job) => {
        if (job.status === 'fulfilled') return job.value;
        else return job.reason;
      }),
    };
  }
}
