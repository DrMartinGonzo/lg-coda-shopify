import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';

import { SyncTableGraphQl } from '../../Fetchers/SyncTableGraphQl';
import { VariablesOf } from '../../utils/graphql';
import { MetaobjectGraphQlFetcher } from './MetaobjectGraphQlFetcher';
import { buildQueryAllMetaObjectsWithFields } from './metaobjects-graphql';
import { Sync_Metaobjects } from './metaobjects-coda';
import { fetchSingleMetaObjectDefinition } from './metaobjects-functions';
import { MetaObjectSyncTableBaseSchema } from '../../schemas/syncTable/MetaObjectSchema';
import { retrieveObjectSchemaEffectiveKeys } from '../../utils/helpers';
import { Metaobject, metaobjectResource } from './metaobjectResource';
import { ShopifyGraphQlThrottleStatus } from '../../Fetchers/Fetcher.types';

export class MetaobjectSyncTable extends SyncTableGraphQl<Metaobject> {
  type: string;

  constructor(fetcher: MetaobjectGraphQlFetcher, params: coda.ParamValues<coda.ParamDefs>) {
    super(metaobjectResource, fetcher, params);
  }

  async executeSync(schema: any) {
    /**
     * We need to get the type ahead of the sync
     * This is a good place to do it because executeSync is already async.
     // TODO: maybe we should do it in beforeSync
     */
    const { type } =
      this.prevContinuation?.extraContinuationData ??
      (await fetchSingleMetaObjectDefinition({ gid: this.fetcher.context.sync.dynamicUrl }, this.fetcher.context));
    this.type = type;

    return super.executeSync(schema);
  }

  setPayload(): void {
    // Separate constant fields keys from the custom ones
    const constantKeys = retrieveObjectSchemaEffectiveKeys(MetaObjectSyncTableBaseSchema).concat('status');
    const optionalFieldsKeys = this.effectivePropertyKeys.filter((key) => !constantKeys.includes(key));

    this.payload = {
      query: buildQueryAllMetaObjectsWithFields(optionalFieldsKeys),
      variables: {
        type: this.type,
        maxEntriesPerRun: this.maxEntriesPerRun,
        includeCapabilities: this.effectivePropertyKeys.includes('status'),
        includeDefinition: false,
        includeFieldDefinitions: false,
        cursor: this.prevContinuation?.cursor ?? null,
      },
    };
  }

  // afterSync(response: MultipleFetchResponse<Metaobject>) {
  //   this.extraContinuationData = { blogIdsLeft: this.blogIdsLeft };
  //   let { restItems, continuation } = super.afterSync(response);
  //   // If we still have blogs left to fetch metaobjects from, we create a
  //   // continuation object to force the next sync
  //   if (this.blogIdsLeft && this.blogIdsLeft.length && !continuation?.nextUrl) {
  //     // @ts-ignore
  //     continuation = {
  //       ...(continuation ?? {}),
  //       extraContinuationData: this.extraContinuationData,
  //     };
  //   }
  //   return { restItems, continuation };
  // }
}
