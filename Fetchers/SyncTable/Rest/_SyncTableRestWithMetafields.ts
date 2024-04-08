// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ResourceWithMetafields } from '../../../resources/Resource.types';
import { fetchMetafieldDefinitionsGraphQl } from '../../../resources/metafieldDefinitions/metafieldDefinitions-functions';
import { getMetafieldKeyValueSetsFromUpdate } from '../../../resources/metafields/utils/metafields-utils-keyValueSets';
import { hasMetafieldsInUpdates } from '../../../resources/metafields/utils/metafields-utils';
import {
  removePrefixFromMetaFieldKey,
  separatePrefixedMetafieldsKeysFromKeys,
} from '../../../resources/metafields/utils/metafields-utils-keys';
import { MetafieldOwnerType } from '../../../types/admin.types';
import { getObjectSchemaEffectiveKey } from '../../../utils/helpers';
import { RestClientWithMetafields } from '../../Client/Rest/_RestClientWithMetafields';
import { SyncTableSyncResult } from '../SyncTable.types';
import { SyncTableRest } from './SyncTableRest';

export abstract class SyncTableRestWithMetafields<
  ResourceT extends ResourceWithMetafields<any, any>
> extends SyncTableRest<ResourceT> {
  readonly fetcher: RestClientWithMetafields<ResourceT>;

  protected effectiveStandardFromKeys: string[];
  protected effectiveMetafieldKeys: string[];
  protected shouldSyncMetafields: boolean;
  protected metafieldOwnerType: MetafieldOwnerType;

  constructor(
    resource: ResourceT,
    fetcher: RestClientWithMetafields<ResourceT>,
    schema: coda.ArraySchema<coda.Schema>,
    codaParams: coda.ParamValues<coda.ParamDefs>
  ) {
    super(resource, fetcher, schema, codaParams);

    this.metafieldOwnerType = this.resource.metafields.ownerType;
    this.effectivePropertyKeys = coda.getEffectivePropertyKeysFromSchema(this.schema);
    const separatedKeys = separatePrefixedMetafieldsKeysFromKeys(this.effectivePropertyKeys);
    this.effectiveStandardFromKeys = separatedKeys.standardFromKeys;
    this.effectiveMetafieldKeys = separatedKeys.prefixedMetafieldFromKeys.map(removePrefixFromMetaFieldKey);
    this.shouldSyncMetafields = !!this.effectiveMetafieldKeys.length;

    // this.setSyncUrl();
  }

  abstract augmentSyncWithMetafields(): Promise<SyncTableSyncResult>;

  async executeUpdate(updates: Array<coda.SyncUpdate<string, string, ResourceT['schema']>>) {
    const metafieldDefinitions = hasMetafieldsInUpdates(updates)
      ? await fetchMetafieldDefinitionsGraphQl({ ownerType: this.metafieldOwnerType }, this.context)
      : [];

    const completed = await Promise.allSettled(
      updates.map(async (update) => {
        // TODO: extract this to a helper ?
        const includedProperties = update.updatedFields.concat([
          getObjectSchemaEffectiveKey(this.resource.schema, this.resource.schema.idProperty),
        ]);
        const previousRow = update.previousValue as ResourceT['codaRow'];
        const newRow = Object.fromEntries(
          Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
        ) as ResourceT['codaRow'];

        const metafieldSets = await getMetafieldKeyValueSetsFromUpdate(newRow, metafieldDefinitions, this.context);
        const restUpdate = this.fetcher.formatRowToApi(newRow);
        const updatedRow = await this.fetcher.updateAndFormatToRow({ id: newRow.id, restUpdate, metafieldSets });

        return {
          ...previousRow,
          ...updatedRow,
        };
      })
    );

    return {
      result: completed.map((job) => {
        if (job.status === 'fulfilled') return job.value;
        else return job.reason;
      }),
    };
  }
}
