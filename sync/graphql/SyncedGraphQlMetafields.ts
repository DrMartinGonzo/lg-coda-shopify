// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ListMetafieldsByOwnerTypeArgs, MetafieldClient } from '../../Clients/GraphQlApiClientBase';
import { GetSchemaArgs } from '../../Resources/Abstract/AbstractResource';
import { MetafieldHelper } from '../../Resources/Mixed/MetafieldHelper';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Metafields } from '../../coda/setup/metafields-setup';
import { CACHE_DISABLED } from '../../constants';
import { FieldDependency } from '../../schemas/Schema.types';
import { MetafieldSyncTableSchema } from '../../schemas/syncTable/MetafieldSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';
import { MetafieldGraphQlModel } from '../../models/graphql/MetafieldGraphQlModel';

// #endregion

export class SyncedGraphQlMetafields extends AbstractSyncedGraphQlResources<MetafieldGraphQlModel> {
  public static schemaDependencies: FieldDependency<typeof MetafieldSyncTableSchema.properties>[] = [
    {
      field: 'admin_url',
      dependencies: ['owner_id'],
    },
  ];

  public static staticSchema = MetafieldSyncTableSchema;

  public static async getDynamicSchema(args: GetSchemaArgs) {
    return MetafieldHelper.getDynamicSchema(args);
  }

  protected get codaParamsMap() {
    const [metafieldKeys] = this.codaParams as CodaSyncParams<typeof Sync_Metafields>;
    return { metafieldKeys };
  }

  protected async sync() {
    return (this.client as MetafieldClient).listByOwnerType(this.getListParams());
  }

  /**
   * Only request the minimum required fields for the owner
   */
  protected codaParamsToListArgs() {
    const { metafieldKeys } = this.codaParamsMap;
    return {
      ownerType: MetafieldOwnerType.Product,
      metafieldKeys: metafieldKeys,
    } as ListMetafieldsByOwnerTypeArgs;
  }

  /**
   * {@link Metafield} has some additional required properties :
   * - label: The label will give us the namespace and key
   * - type
   * - owner_type
   * - owner_id if not a Shop metafield
   */
  // protected getRequiredPropertiesForUpdate(update: coda.SyncUpdate<string, string, any>) {
  //   const additionalProperties = ['label', 'type', 'owner_type'];
  //   if (update.newValue.owner_type !== MetafieldOwnerType.Shop) {
  //     additionalProperties.push('owner_id');
  //   }

  //   return super.getRequiredPropertiesForUpdate(update).concat(additionalProperties);
  // }
}