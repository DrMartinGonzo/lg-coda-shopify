// #region Imports
import * as coda from '@codahq/packs-sdk';

import { AbstractResource } from './AbstractResource';
import { AbstractResource_Synced_HasMetafields } from './AbstractResource_Synced_HasMetafields';
import { SyncTableRestHasGraphQlMetafields } from './SyncTableRestHasGraphQlMetafields';

// #endregion

export abstract class AbstractResource_Synced_HasMetafields_GraphQl extends AbstractResource_Synced_HasMetafields {
  public static async getSyncTableManager(
    context: coda.SyncExecutionContext,
    codaSyncParams: coda.ParamValues<coda.ParamDefs>
  ) {
    const schema = await this.getArraySchema({ codaSyncParams, context });
    return new SyncTableRestHasGraphQlMetafields<AbstractResource_Synced_HasMetafields_GraphQl>(
      schema,
      codaSyncParams,
      context
    );
  }
}
