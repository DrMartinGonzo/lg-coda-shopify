// #region Imports
import * as coda from '@codahq/packs-sdk';
import { TadaDocumentNode } from 'gql.tada';
import { readFragment } from '../../../utils/tada-utils';

import { metafieldFieldsFragment } from '../../../graphql/metafields-graphql';
import { BaseRow } from '../../../schemas/CodaRows.types';
import { MetafieldInput, MetafieldOwnerType } from '../../../types/admin.types';
import { MetafieldDefinition } from '../../GraphQl/MetafieldDefinition';
import { MetafieldGraphQl } from '../../GraphQl/MetafieldGraphQl';
import { MetafieldHelper } from '../../Mixed/MetafieldHelper';
import { Metafield } from '../../Rest/Metafield';
import { SupportedMetafieldOwnerResource } from '../../../models/rest/MetafieldModel';
import { hasMetafieldsInRow } from '../../utils/abstractResource-utils';
import { AbstractRestResourceWithMetafields } from '../Rest/AbstractRestResourceWithMetafields';
import { AbstractGraphQlResource, BaseSaveArgs, GraphQlApiDataWithMetafields } from './AbstractGraphQlResource';
import { SyncTableManagerGraphQlWithMetafields } from '../../../SyncTableManager/GraphQl/SyncTableManagerGraphQl';

// #endregion

export abstract class AbstractGraphQlResourceWithMetafields extends AbstractGraphQlResource {
  public apiData: GraphQlApiDataWithMetafields;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource;
  public static readonly metafieldGraphQlOwnerType: MetafieldOwnerType | undefined;

  protected static metafieldDefinitions: Array<MetafieldDefinition>;

  protected static SyncTableManager = SyncTableManagerGraphQlWithMetafields;

  /** Same code as in {@link AbstractRestResourceWithMetafields.getMetafieldDefinitions} */
  public static async getMetafieldDefinitions(context: coda.ExecutionContext): Promise<Array<MetafieldDefinition>> {
    if (this.metafieldDefinitions) return this.metafieldDefinitions;

    this.metafieldDefinitions = await MetafieldHelper.getMetafieldDefinitionsForOwner({
      context,
      ownerType: this.metafieldGraphQlOwnerType,
    });

    return this.metafieldDefinitions;
  }

  /** Mostly the same code as {@link AbstractRestResourceWithMetafields.createInstanceForUpdate} */
  protected static async createInstanceForUpdate(
    prevRow: BaseRow,
    newRow: BaseRow,
    context: coda.SyncExecutionContext
  ) {
    if (!hasMetafieldsInRow(newRow)) {
      return super.createInstanceForUpdate(prevRow, newRow, context);
    }

    const metafieldDefinitions = await this.getMetafieldDefinitions(context);
    const metafields = await Metafield.createInstancesFromRow({
      context,
      row: newRow,
      metafieldDefinitions,
      ownerResource: this.metafieldRestOwnerType,
    });

    return new (this as any)({
      context,
      fromRow: { row: newRow, metafields },
    }) as AbstractGraphQlResourceWithMetafields;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected setData(data: typeof this.apiData): void {
    super.setData(data);

    /**
     * Convert GraphQl Metafields to Rest Metafields
     */
    if (data.metafields?.nodes && data.metafields.nodes.length) {
      this.apiData.restMetafieldInstances = data.metafields.nodes.map((m) =>
        Metafield.createInstanceFromGraphQlMetafield(
          this.context,
          readFragment(metafieldFieldsFragment, m) as MetafieldGraphQl['apiData'],
          data.id
        )
      );
    }
  }

  protected async _baseSave<NodeT extends TadaDocumentNode>({
    update = false,
    documentNode,
    variables,
  }: BaseSaveArgs<NodeT> & { variables: { metafields?: Array<MetafieldInput> } }): Promise<void> {
    const { restMetafieldInstances } = this.apiData;

    if (restMetafieldInstances && restMetafieldInstances.length) {
      const staticOwnerResource = this.resource<typeof AbstractGraphQlResourceWithMetafields>();
      const { primaryKey } = staticOwnerResource;
      const isUpdate = this.apiData[primaryKey];

      /**
       * When performing an update on a GraphQl resource, we must
       * create/update/delete metafields individually using Rest, as its easier
       * since it doesn't require to know the metafield ID in advance
       */
      if (isUpdate) {
        const newMetafields = await Promise.all(
          restMetafieldInstances.map(async (m) => {
            await m.saveAndUpdate();
            return m;
          })
        );

        await super._baseSave({ update, documentNode, variables });
        if (update) this.apiData.restMetafieldInstances = newMetafields;
        return;
      }
      //
      /**
       * When creating a resource, we can create the metafields in bulk directly
       * on the main request. We have to use the metafields data and not the
       * Metafield instances themselves.
       */
      else {
        variables.metafields = this.apiData.restMetafieldInstances.map((metafield: Metafield) => {
          const { key, namespace, type, value } = metafield.apiData;
          return {
            key,
            namespace,
            type,
            value,
          };
        });
      }
    }

    await super._baseSave({ update, documentNode, variables });
  }
}
