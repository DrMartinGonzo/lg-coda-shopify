// #region Imports
import * as coda from '@codahq/packs-sdk';

import { SyncTableManagerRestWithGraphQlMetafields } from '../../../SyncTableManager/Rest/SyncTableManagerRestWithGraphQlMetafields';
import { AbstractSyncedRestResourceWithMetafields } from './AbstractSyncedRestResourceWithMetafields';

// #endregion

export abstract class AbstractSyncedRestResourceWithGraphQLMetafields extends AbstractSyncedRestResourceWithMetafields {
  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ) {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableManagerRestWithGraphQlMetafields<AbstractSyncedRestResourceWithGraphQLMetafields>({
      schema,
      codaSyncParams,
      context,
    });
  }
}
