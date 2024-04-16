// #region Imports
import * as coda from '@codahq/packs-sdk';
import { TadaDocumentNode } from 'gql.tada';
import { FragmentOf } from '../../../utils/tada-utils';

import { CACHE_DEFAULT } from '../../../constants';
import { metafieldFieldsFragment } from '../../../graphql/metafields-graphql';
import { BaseRow } from '../../../schemas/CodaRows.types';
import { MetafieldInput, MetafieldOwnerType } from '../../../types/admin.types';
import { MetafieldDefinition } from '../../GraphQl/MetafieldDefinition';
import { Metafield, SupportedMetafieldOwnerResource } from '../../Rest/Metafield';
import { hasMetafieldsInRow } from '../../utils/abstractResource-utils';
import { BaseSaveArgs, GraphQlApiData } from './AbstractGraphQlResource';
import { AbstractSyncedGraphQlResource } from './AbstractSyncedGraphQlResource';
// import { RestResourceError } from '@shopify/shopify-api';

// #endregion

// #region Types
export interface GraphQlApiDataWithMetafields extends GraphQlApiData {
  metafields: { nodes: Array<FragmentOf<typeof metafieldFieldsFragment>> };
  restMetafieldInstances?: Array<Metafield>;
}
// #endregion

export abstract class AbstractSyncedGraphQlResourceWithMetafields extends AbstractSyncedGraphQlResource {
  public apiData: GraphQlApiDataWithMetafields;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource;
  public static readonly metafieldGraphQlOwnerType: MetafieldOwnerType | undefined;

  protected static metafieldDefinitions: Array<MetafieldDefinition>;

  // TODO: this is duplicate code from AbstractResource_Synced_HasMetafields
  protected static async getMetafieldDefinitions(
    context: coda.ExecutionContext,
    includeFakeExtraDefinitions: boolean = true
  ): Promise<Array<MetafieldDefinition>> {
    if (this.metafieldDefinitions) return this.metafieldDefinitions;

    console.log('🍏🍏🍏🍏🍏🍏🍏🍏🍏🍏 FETCH');
    return MetafieldDefinition.allForOwner({
      context,
      ownerType: this.metafieldGraphQlOwnerType,
      includeFakeExtraDefinitions,
      options: { cacheTtlSecs: CACHE_DEFAULT },
    });

    // return metafieldDefinitions.map((m) => m.apiData);
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
  // TODO: fix any
  protected setData(data: typeof this.apiData): void {
    this.apiData = data;

    /**
     * Convert GraphQl Metafields to Rest Metafields
     */
    if (data.metafields?.nodes && data.metafields.nodes.length) {
      this.apiData.restMetafieldInstances = data.metafields.nodes.map((m) =>
        Metafield.createInstanceFromGraphQlMetafield(this.context, m, data.id)
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

  // TODO: remove ?
  // protected formatMetafields() {
  //   const formattedMetafields: Record<string, any> = {};
  //   if (this.apiData.metafields?.nodes) {
  //     const metafields = readFragment(
  //       metafieldFieldsFragment,
  //       this.apiData.metafields.nodes as Array<FragmentOf<typeof metafieldFieldsFragment>>
  //     );
  //     metafields.forEach((metafield) => {
  //       const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
  //       formattedMetafields[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
  //     });
  //   }
  //   return formattedMetafields;
  // }
}
