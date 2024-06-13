// #region Imports
import * as coda from '@codahq/packs-sdk';

import { GetSchemaArgs } from '../AbstractSyncedResources';
import { MetafieldHelper } from '../../models/utils/MetafieldHelper';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_Metafields } from '../../coda/setup/metafields-setup';
import { AbstractModelRestWithRestMetafields } from '../../models/rest/AbstractModelRestWithMetafields';
import { FieldDependency } from '../../schemas/Schema.types';
import { MetafieldSyncTableSchema } from '../../schemas/syncTable/MetafieldSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { AbstractSyncedRestResources } from './AbstractSyncedRestResources';
import { parseContinuationProperty, stringifyContinuationProperty } from '../utils/sync-utils';
import { MetafieldDefinitionModelData } from '../../models/graphql/MetafieldDefinitionModel';
import { getMetaFieldFullKey } from '../../utils/metafields-utils';
import { PREFIX_FAKE } from '../../constants';
import { graphQlGidToId } from '../../utils/conversion-utils';

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

  public static staticSchema = MetafieldHelper.staticSchema;

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
    this.data = metafields;

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
    return (this.data as unknown as OwnerT[]).map((owner) => owner.data.metafields).flat();
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
  protected getRequiredPropertiesForUpdate(update: coda.SyncUpdate<string, string, any>) {
    const extraRequiredProps = ['label', 'type', 'owner_type'];
    if (update.newValue.owner_type !== MetafieldOwnerType.Shop) {
      extraRequiredProps.push('owner_id');
    }

    return super.getRequiredPropertiesForUpdate(update).concat(extraRequiredProps);
  }
}
