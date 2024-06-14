// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ListMetafieldsByOwnerTypeArgs, MetafieldClient } from '../../Clients/GraphQlClients';
import { Sync_Metafields } from '../../coda/setup/metafields-setup';
import { MetafieldGraphQlModel } from '../../models/graphql/MetafieldGraphQlModel';
import { getMetafieldsDynamicSchema } from '../../models/utils/MetafieldHelper';
import { FieldDependency } from '../../schemas/Schema.types';
import { MetafieldSyncTableSchema } from '../../schemas/syncTable/MetafieldSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { CodaSyncParams, GetSchemaArgs } from '../AbstractSyncedResources';
import { AbstractSyncedGraphQlResources } from './AbstractSyncedGraphQlResources';

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
    return getMetafieldsDynamicSchema(args);
  }

  public get codaParamsMap() {
    const ownerType = this.context.sync.dynamicUrl as MetafieldOwnerType;
    const [metafieldKeys] = this.codaParams as CodaSyncParams<typeof Sync_Metafields>;
    return { metafieldKeys, ownerType };
  }

  protected async sync() {
    return (this.client as MetafieldClient).listByOwnerType(this.getListParams());
  }

  /**
   * Only request the minimum required fields for the owner
   */
  protected codaParamsToListArgs() {
    const { metafieldKeys, ownerType } = this.codaParamsMap;
    return { ownerType, metafieldKeys } as ListMetafieldsByOwnerTypeArgs;
  }

  /**
   * {@link MetafieldGraphQlModel} has some additional required properties :
   * - label: The label will give us the namespace and key
   * - type
   * - owner_type
   * - owner_id if not a Shop metafield
   */
  protected getRequiredPropertiesForUpdate(update: coda.SyncUpdate<string, string, any>) {
    const extraRequiredProps = ['label', 'type', 'owner_type'];
    if (update.newValue.owner_type !== MetafieldOwnerType.Shop) {
      extraRequiredProps.push('owner_id');
    }

    return super.getRequiredPropertiesForUpdate(update).concat(extraRequiredProps);
  }
}
