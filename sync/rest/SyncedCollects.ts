// #region Imports

import { ListCollectsArgs } from '../../Clients/RestApiClientBase';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_Collects } from '../../coda/setup/collects-setup';
import { CollectModel } from '../../models/rest/CollectModel';
import { FieldDependency } from '../../schemas/Schema.types';
import { CollectSyncTableSchema } from '../../schemas/syncTable/CollectSchema';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

export class SyncedCollects extends AbstractSyncedRestResources<CollectModel> {
  public static schemaDependencies: FieldDependency<typeof CollectSyncTableSchema.properties>[] = [
    {
      field: 'product_id',
      dependencies: ['product'],
    },
    {
      field: 'collection_id',
      dependencies: ['collection'],
    },
    {
      field: 'published_at',
      dependencies: ['published'],
    },
  ];

  public static staticSchema = CollectSyncTableSchema;

  public get codaParamsMap() {
    const [collectionId] = this.codaParams as CodaSyncParams<typeof Sync_Collects>;
    return {
      collectionId,
    };
  }

  protected codaParamsToListArgs(): Omit<ListCollectsArgs, 'limit' | 'options'> {
    const { collectionId } = this.codaParamsMap;
    return {
      fields: this.syncedStandardFields.join(','),
      collection_id: collectionId,
    };
  }
}
