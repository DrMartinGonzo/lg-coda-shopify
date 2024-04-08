// #region Imports
import * as coda from '@codahq/packs-sdk';

import { METAFIELDS_REQUIRED } from '../constants';
import { ResourceWithMetafields } from '../resources/Resource.types';
import { fetchMetafieldDefinitionsGraphQl } from '../resources/metafieldDefinitions/metafieldDefinitions-functions';
import { fetchMetafieldsRest } from '../resources/metafields/metafields-functions';
import {
  getMetaFieldFullKey,
  hasMetafieldsInUpdates,
  preprendPrefixToMetaFieldKey,
} from '../resources/metafields/metafields-helpers';
import { RowWithMetafields } from '../schemas/CodaRows.types';
import { formatMetaFieldValueForSchema } from '../schemas/schema-helpers';
import { RestClient } from './RestClient';
import { RestClientWithRestMetafields } from './RestClientWithRestMetafields';
import { SyncTableRestWithMetafields } from './SyncTableRestWithMetafields';

// #endregion

export abstract class SyncTableRestWithMetafieldsRest<
  ResourceT extends ResourceWithMetafields<any, any>
> extends SyncTableRestWithMetafields<ResourceT> {
  readonly fetcher: RestClientWithRestMetafields<ResourceT>;

  constructor(resource: ResourceT, fetcher: RestClient<ResourceT>, codaParams: coda.ParamValues<coda.ParamDefs>) {
    super(resource, fetcher, codaParams);
  }

  // #region Sync
  async executeSyncWithMetafields(schema: any) {
    const mainResults = await this.executeSync(schema);
    if (this.shouldSyncMetafields) {
      return this.augmentSyncWithMetafields();
    }
    return mainResults;
  }

  // TODO
  async executeUpdate(updates: Array<coda.SyncUpdate<string, string, ResourceT['schema']>>) {
    const metafieldDefinitions =
      !!this.metafieldOwnerType && hasMetafieldsInUpdates(updates)
        ? await fetchMetafieldDefinitionsGraphQl({ ownerType: this.metafieldOwnerType }, this.context)
        : [];

    const completed = await Promise.allSettled(
      updates.map(async (update) => this.fetcher.handleUpdateJob(update, metafieldDefinitions))
    );
    return {
      result: completed.map((job) => {
        if (job.status === 'fulfilled') return job.value;
        else return job.reason;
      }),
    };
  }
  // #endregion

  // #region Augmented Metafields Sync
  async augmentResourceWithMetafields(data: ResourceT['codaRow']) {
    if (typeof data.id !== 'number') {
      throw new Error('syncMetafields only support ids as numbers');
    }
    if (!('metafields' in this.resource)) {
      throw new Error(METAFIELDS_REQUIRED);
    }

    // console.log('data.id', data.id);
    // TODO: request only requested metafields
    // const response = await this.fetcher.fetchMetafields(data.id);
    // const metafieldFetcher = new MetafieldRestFetcher(this.resource, data.id, this.context);
    // const response = await metafieldFetcher.fetchAll({});
    const response = await fetchMetafieldsRest(data.id, this.resource, {}, this.context);

    const updatedData = { ...data } as RowWithMetafields<ResourceT['codaRow']>;

    // Only keep metafields that have a definition and in the schema
    const metafields = response.body.metafields.filter((m) =>
      this.effectiveMetafieldKeys.includes(getMetaFieldFullKey(m))
    );
    if (metafields.length) {
      metafields.forEach((metafield) => {
        const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
        (updatedData as any)[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
      });
    }
    return updatedData;
  }
  async augmentSyncWithMetafields() {
    this.items = await Promise.all(
      this.items.map((item) => {
        return this.augmentResourceWithMetafields(item);
      })
    );
    return {
      result: this.items,
      continuation: this.continuation,
    };
  }
  // #endregion
}
