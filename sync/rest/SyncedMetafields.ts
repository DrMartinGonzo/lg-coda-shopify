// #region Imports
import * as coda from '@codahq/packs-sdk';

import { Sync_Metafields } from '../../coda/setup/metafields-setup';
import { PREFIX_FAKE } from '../../constants/strings-constants';
import { graphQlGidToId } from '../../graphql/utils/graphql-utils';
import { MetafieldDefinitionModelData } from '../../models/graphql/MetafieldDefinitionModel';
import { AbstractModelRestWithRestMetafields } from '../../models/rest/AbstractModelRestWithMetafields';
import { getMetaFieldFullKey, getMetafieldsDynamicSchema } from '../../models/utils/metafields-utils';
import { MetafieldRow } from '../../schemas/CodaRows.types';
import { FieldDependency } from '../../schemas/Schema.types';
import { MetafieldSyncTableSchema } from '../../schemas/syncTable/MetafieldSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { CodaSyncParams, GetSchemaArgs } from '../AbstractSyncedResources';
import { parseContinuationProperty, stringifyContinuationProperty } from '../utils/sync-utils';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';

// #endregion

// #region Types
export type SyncMetafieldsParams = CodaSyncParams<typeof Sync_Metafields>;
// #endregion

export class SyncedMetafields<
  OwnerT extends AbstractModelRestWithRestMetafields
> extends AbstractSyncedRestResources<OwnerT> {
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
    const [metafieldKeys] = this.codaParams as SyncMetafieldsParams;
    return { metafieldKeys };
  }

  protected async createInstanceFromRow(row: MetafieldRow) {
    return super.createInstanceFromRow({
      ...row,
      owner_type: this.context.sync.dynamicUrl,
    });
  }

  protected async beforeSync(): Promise<void> {
    // Force sync metafields for the owner
    this.shouldSyncMetafields = true;
  }

  protected async afterSync(): Promise<void> {
    const { metafieldKeys } = this.codaParamsMap;

    // We need metafield definitions in order to get the definition id
    const metafieldDefinitions: MetafieldDefinitionModelData[] = this.prevContinuation?.extraData?.metafieldDefinitions
      ? parseContinuationProperty(this.prevContinuation.extraData.metafieldDefinitions)
      : (await this.getMetafieldDefinitions()).map((d) => d.data);

    const metafields = this.flattenOwnerMetafields()
      .filter((m) => (metafieldKeys ? metafieldKeys.includes(m.fullKey) : true))
      .map((m) => {
        const matchDefinition = metafieldDefinitions.find((f) => f && getMetaFieldFullKey(f) === m.fullKey);
        if (matchDefinition && matchDefinition.id) {
          // Edge case, definition id can be a fake id
          if (!(typeof matchDefinition.id === 'string' && matchDefinition.id.startsWith(PREFIX_FAKE))) {
            m.data.definition_id = graphQlGidToId(matchDefinition.id);
          }
        }
        return m;
      });
    /**
     * this.data expect a type of Array<T> but we give it an array of Metafield
     * instances. This is normal as we would need too much typescript typing to
     * correct this for what it's worth now.
     *
     // TODO: revisit in the future ⤴
     */
    // @ts-expect-error
    this.models = metafields;

    if (this.continuation) {
      this.continuation = {
        ...this.continuation,
        extraData: {
          ...(this.continuation.extraData ?? {}),
          metafieldDefinitions: stringifyContinuationProperty(metafieldDefinitions),
        },
      };
    }
  }
  private flattenOwnerMetafields() {
    return (this.models as unknown as OwnerT[]).map((owner) => owner.data.metafields).flat();
  }

  /**
   * Only request the minimum required fields for the owner
   */
  protected codaParamsToListArgs() {
    return { fields: 'id' };
  }

  /**
   * {@link MetafieldModel} has some additional required properties :
   * - label: The label will give us the namespace and key
   * - type
   * - owner_type
   * - owner_id if not a Shop metafield
   */
  protected getAdditionalRequiredKeysForUpdate(update: coda.SyncUpdate<string, string, any>) {
    const additionalKeys = ['label', 'type'];
    const ownerType = this.context.sync.dynamicUrl;
    if (ownerType !== MetafieldOwnerType.Shop) {
      additionalKeys.push('owner_id');
    }
    return [...super.getAdditionalRequiredKeysForUpdate(update), ...additionalKeys];
  }
}
