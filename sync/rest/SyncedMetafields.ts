// #region Imports
import * as coda from '@codahq/packs-sdk';

import { GetSchemaArgs } from '../../Resources/Abstract/AbstractResource';
import { MetafieldHelper } from '../../Resources/Mixed/MetafieldHelper';
import { CodaSyncParams } from '../../SyncTableManager/types/SyncTableManager.types';
import { Sync_Metafields } from '../../coda/setup/metafields-setup';
import { AbstractModelRestWithRestMetafields } from '../../models/rest/AbstractModelRestWithMetafields';
import { FieldDependency } from '../../schemas/Schema.types';
import { MetafieldSyncTableSchema } from '../../schemas/syncTable/MetafieldSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

export class SyncedMetafields<
  OwnerT extends AbstractModelRestWithRestMetafields<OwnerT>
> extends AbstractSyncedRestResources<OwnerT> {
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

  public get codaParamsMap() {
    const [metafieldKeys] = this.codaParams as CodaSyncParams<typeof Sync_Metafields>;
    return { metafieldKeys };
  }

  protected async beforeSync(): Promise<void> {
    // Force sync metafields for the owner
    this.shouldSyncMetafields = true;
  }

  protected async afterSync(): Promise<void> {
    const { metafieldKeys } = this.codaParamsMap;
    const metafields = this.flattenOwnerMetafields().filter((m) =>
      metafieldKeys ? metafieldKeys.includes(m.fullKey) : true
    );
    /**
     * this.data expect a type of Array<T> but we give it an array of Metafield
     * instances. This is normal as we would need too much typescript typing to
     * correct this for what it's worth now.
     *
     // TODO: revisit in the future ⤴
     */
    // @ts-expect-error
    this.data = metafields;
  }
  private flattenOwnerMetafields() {
    return (this.data as unknown as OwnerT[]).map((owner) => owner.data.metafields).flat();
  }

  /**
   * Only request the minimum required fields for the owner
   */
  protected codaParamsToListArgs() {
    return { fields: 'id' };
  }

  /**
   * {@link Metafield} has some additional required properties :
   * - label: The label will give us the namespace and key
   * - type
   * - owner_type
   * - owner_id if not a Shop metafield
   */
  protected getRequiredPropertiesForUpdate(update: coda.SyncUpdate<string, string, any>) {
    const additionalProperties = ['label', 'type', 'owner_type'];
    if (update.newValue.owner_type !== MetafieldOwnerType.Shop) {
      additionalProperties.push('owner_id');
    }

    return super.getRequiredPropertiesForUpdate(update).concat(additionalProperties);
  }
}
