// #region Imports
import * as coda from '@codahq/packs-sdk';

import { SyncTableManagerRestHasRestMetafields } from '../SyncTableManager/SyncTableManagerRestHasGraphQlMetafields';
import { AbstractResource_Synced_HasMetafields } from './AbstractResource_Synced_HasMetafields';

// #endregion

export abstract class AbstractResource_Synced_HasMetafields_GraphQl extends AbstractResource_Synced_HasMetafields {
  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ) {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableManagerRestHasRestMetafields<AbstractResource_Synced_HasMetafields_GraphQl>(
      schema,
      codaSyncParams,
      context
    );
  }
}
