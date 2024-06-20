// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ListMetafieldsByOwnerTypeArgs, MetafieldClient } from '../../Clients/GraphQlClients';
import { MetafieldGraphQlModel } from '../../models/graphql/MetafieldGraphQlModel';
import { getMetafieldsDynamicSchema } from '../../models/utils/metafields-utils';
import { MetafieldRow } from '../../schemas/CodaRows.types';
import { FieldDependency } from '../../schemas/Schema.types';
import { MetafieldSyncTableSchema } from '../../schemas/syncTable/MetafieldSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { SyncMetafieldsParams } from '../rest/SyncedMetafields';
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
    const [metafieldKeys] = this.codaParams as SyncMetafieldsParams;
    return { metafieldKeys, ownerType };
  }

  protected async createInstanceFromRow(row: MetafieldRow) {
    return super.createInstanceFromRow({
      ...row,
      owner_type: this.context.sync.dynamicUrl,
    });
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
  protected getAdditionalRequiredKeysForUpdate(update: coda.SyncUpdate<string, string, any>) {
    const additionalKeys = ['label', 'type', 'owner_id'];
    return [...super.getAdditionalRequiredKeysForUpdate(update), ...additionalKeys];
  }
}
