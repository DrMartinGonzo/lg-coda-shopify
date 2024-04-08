import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../utils/graphql';

import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { ResourceWithMetafields } from '../resources/Resource.types';
import { metafieldDefinitionFragment } from '../resources/metafieldDefinitions/metafieldDefinitions-graphql';
import { MetafieldRestFetcher } from '../resources/metafields/MetafieldRestFetcher';
import { getMetafieldKeyValueSetsFromUpdate } from '../resources/metafields/metafields-functions';
import {
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
  shouldUpdateSyncTableMetafieldValue,
} from '../resources/metafields/metafields-helpers';
import { formatMetaFieldValueForSchema } from '../schemas/schema-helpers';
import { getObjectSchemaEffectiveKey } from '../utils/helpers';
import { FetchRequestOptions } from './Fetcher.types';
import { RestClient } from './RestClient';

export abstract class RestClientWithRestMetafields<
  ResourceT extends ResourceWithMetafields<any, any>
> extends RestClient<ResourceT> {
  // #region Requests
  fetchMetafields(id?: number, requestOptions: FetchRequestOptions = {}) {
    const metafieldFetcher = new MetafieldRestFetcher(this.resource, id, this.context);
    return metafieldFetcher.fetchAll({}, requestOptions);
  }

  async handleUpdateJob(
    update: coda.SyncUpdate<string, string, ResourceT['schema']>,
    metafieldDefinitions: ResultOf<typeof metafieldDefinitionFragment>[] = []
  ) {
    // TODO: extract this part to a helper
    const includedProperties = update.updatedFields.concat([
      getObjectSchemaEffectiveKey(this.schema, this.schema.idProperty),
    ]);
    const updatedRow = Object.fromEntries(
      Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
    ) as ResourceT['codaRow'];
    // END TODO

    const result = await super.handleUpdateJob(update, metafieldDefinitions);

    const metafieldKeyValueSets = await getMetafieldKeyValueSetsFromUpdate(
      updatedRow,
      metafieldDefinitions,
      this.context
    );
    if (metafieldKeyValueSets.length) {
      const formattedMetafields = await this.updateAndFormatMetafields({ rowId: result.id, metafieldKeyValueSets });
      return {
        ...result,
        ...formattedMetafields,
      };
    }
    return result;
  }

  async handleUpdateJobNew(
    row: {
      original?: ResourceT['codaRow'];
      updated: ResourceT['codaRow'];
    },
    metafieldDefinitions: ResultOf<typeof metafieldDefinitionFragment>[] = []
  ) {
    const updatedRow = row.updated;

    const result = await super.handleUpdateJobNew(row, metafieldDefinitions);

    const metafieldKeyValueSets = await getMetafieldKeyValueSetsFromUpdate(
      updatedRow,
      metafieldDefinitions,
      this.context
    );
    if (metafieldKeyValueSets.length) {
      const formattedMetafields = await this.updateAndFormatMetafields({ rowId: result.id, metafieldKeyValueSets });
      return {
        ...result,
        ...formattedMetafields,
      };
    }
    return result;
  }

  // TODO: write description
  async updateAndFormatMetafields(params: {
    rowId: number;
    metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet>;
    /** Wether the data will be consumed by an action wich result use a `coda.withIdentity` schema. */
    schemaWithIdentity?: boolean;
  }): Promise<{ [key: string]: any }> {
    let obj = {};

    const metafieldFetcher = new MetafieldRestFetcher(this.resource, params.rowId, this.context);
    const { deletedMetafields, updatedMetafields } = await metafieldFetcher.set(params.metafieldKeyValueSets);
    if (deletedMetafields.length) {
      deletedMetafields.forEach((m) => {
        const prefixedKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(m));
        obj[prefixedKey] = undefined;
      });
    }

    if (updatedMetafields.length) {
      updatedMetafields.forEach((metafield) => {
        const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
        if (shouldUpdateSyncTableMetafieldValue(metafield.type, params.schemaWithIdentity)) {
          obj[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
        }
      });
    }

    return obj;
  }

  async updateWithMetafields(
    row: { original?: ResourceT['codaRow']; updated: ResourceT['codaRow'] },
    metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet> = []
  ): Promise<ResourceT['codaRow']> {
    const result = await super.handleUpdateJobNew(row);
    if (metafieldKeyValueSets.length) {
      const formattedMetafields = await this.updateAndFormatMetafields({ rowId: result.id, metafieldKeyValueSets });
      return {
        ...result,
        ...formattedMetafields,
      };
    }
    return result;
  }

  // #endregion
}
