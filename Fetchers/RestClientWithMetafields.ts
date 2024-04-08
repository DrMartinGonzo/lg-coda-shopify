import { ResultOf } from '../utils/graphql';

import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { ResourceWithMetafields } from '../resources/Resource.types';
import { metafieldDefinitionFragment } from '../resources/metafieldDefinitions/metafieldDefinitions-graphql';
import { getMetafieldKeyValueSetsFromUpdate } from '../resources/metafields/metafields-functions';
import { RestClient } from './RestClient';

export abstract class RestClientWithMetafields<
  ResourceT extends ResourceWithMetafields<any, any>
> extends RestClient<ResourceT> {
  async handleUpdateJob(
    row: {
      original?: ResourceT['codaRow'];
      updated: ResourceT['codaRow'];
    },
    metafieldDefinitions: ResultOf<typeof metafieldDefinitionFragment>[] = []
  ) {
    const updatedRow = row.updated;
    const mainResult = await super.handleUpdateJob(row);

    const metafieldKeyValueSets = await getMetafieldKeyValueSetsFromUpdate(
      updatedRow,
      metafieldDefinitions,
      this.context
    );
    if (metafieldKeyValueSets.length) {
      const formattedMetafields = await this.updateAndFormatMetafields({ rowId: mainResult.id, metafieldKeyValueSets });
      return {
        ...mainResult,
        ...formattedMetafields,
      };
    }

    return mainResult;
  }

  // TODO: write description
  abstract updateAndFormatMetafields(params: {
    rowId: number;
    metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet>;
    /** Wether the data will be consumed by an action wich result use a `coda.withIdentity` schema. */
    schemaWithIdentity?: boolean;
  }): Promise<{ [key: string]: any }>;

  // TODO: rename to update
  async updateWithMetafields(
    row: { original?: ResourceT['codaRow']; updated: ResourceT['codaRow'] },
    metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet> = []
  ): Promise<ResourceT['codaRow']> {
    const result = await super.handleUpdateJob(row);
    if (metafieldKeyValueSets.length) {
      const formattedMetafields = await this.updateAndFormatMetafields({ rowId: result.id, metafieldKeyValueSets });
      return {
        ...result,
        ...formattedMetafields,
      };
    }
    return result;
  }
}
