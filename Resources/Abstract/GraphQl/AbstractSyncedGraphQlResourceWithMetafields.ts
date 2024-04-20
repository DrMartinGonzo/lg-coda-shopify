// #region Imports
import * as coda from '@codahq/packs-sdk';
import { TadaDocumentNode } from 'gql.tada';
import { FragmentOf, readFragment } from '../../../utils/tada-utils';

import { metafieldFieldsFragment } from '../../../graphql/metafields-graphql';
import { BaseRow } from '../../../schemas/CodaRows.types';
import { MetafieldInput, MetafieldOwnerType } from '../../../types/admin.types';
import { MetafieldDefinition } from '../../GraphQl/MetafieldDefinition';
import { MetafieldGraphQl } from '../../GraphQl/MetafieldGraphQl';
import { MetafieldHelper } from '../../Mixed/MetafieldHelper';
import { Metafield, SupportedMetafieldOwnerResource } from '../../Rest/Metafield';
import { Node } from '../../types/Resource.types';
import { hasMetafieldsInRow } from '../../utils/abstractResource-utils';
import { BaseSaveArgs, GraphQlApiData } from './AbstractGraphQlResource';
import { AbstractSyncedGraphQlResource } from './AbstractSyncedGraphQlResource';

// #endregion

// #region Types
export interface GraphQlApiDataWithMetafields extends GraphQlApiData {
  metafields: { nodes: Array<FragmentOf<typeof metafieldFieldsFragment>> };
  restMetafieldInstances?: Array<Metafield>;
}
export interface GraphQlApiDataWithParentNode extends GraphQlApiData {
  parentNode: Node;
}
// #endregion

export abstract class AbstractSyncedGraphQlResourceWithMetafields extends AbstractSyncedGraphQlResource {
  public apiData: GraphQlApiDataWithMetafields;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource;
  public static readonly metafieldGraphQlOwnerType: MetafieldOwnerType | undefined;

  protected static metafieldDefinitions: Array<MetafieldDefinition>;

  // TODO: this is duplicate code from AbstractResource_Synced_HasMetafields
  protected static async getMetafieldDefinitions(context: coda.ExecutionContext): Promise<Array<MetafieldDefinition>> {
    if (this.metafieldDefinitions) return this.metafieldDefinitions;

    this.metafieldDefinitions = await MetafieldHelper.getMetafieldDefinitionsForOwner({
      context,
      ownerType: this.metafieldGraphQlOwnerType,
    });

    return this.metafieldDefinitions;
  }

  protected static async handleRowUpdate(prevRow: BaseRow, newRow: BaseRow, context: coda.SyncExecutionContext) {
    if (hasMetafieldsInRow(newRow)) {
      // TODO: create MetafieldGraphQL Instances instead of Rest ?
      const metafieldDefinitions = await this.getMetafieldDefinitions(context);
      const metafields = await Metafield.createInstancesFromRow({
        context,
        row: newRow,
        metafieldDefinitions,
        ownerResource: this.metafieldRestOwnerType,
      });

      const instance: AbstractSyncedGraphQlResourceWithMetafields = new (this as any)({
        context,
        fromRow: { row: newRow, metafields },
      });
      await instance.saveAndUpdate();
      return { ...prevRow, ...instance.formatToRow() };
    }

    return super.handleRowUpdate(prevRow, newRow, context);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  protected setData(data: typeof this.apiData): void {
    this.apiData = data;

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
      const staticOwnerResource = this.resource<typeof AbstractSyncedGraphQlResourceWithMetafields>();
      const { primaryKey } = staticOwnerResource;
      const isUpdate = this.apiData[primaryKey];

      /**
       * When performing an update on a GraphQl resource, we must
       * create/update/delete metafields individually using Rest, as its easier
       * since it doesn't require to know the metafield ID in advance
       */
      if (isUpdate) {
        const newMetafields = await Promise.all(
          restMetafieldInstances.map(async (m: Metafield) => {
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
       * */
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
