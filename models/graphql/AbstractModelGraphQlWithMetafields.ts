// #region Imports

import { MetafieldClient as MetafieldGraphQlClient } from '../../Clients/GraphQlClients';
import { MetafieldOwnerType } from '../../types/admin.types';
import { SupportedMetafieldOwnerResource } from '../rest/MetafieldModel';
import { AbstractModelGraphQl, BaseApiDataGraphQl, BaseModelDataGraphQl } from './AbstractModelGraphQl';
import { MetafieldGraphQlModel, MetafieldModelData, MetafieldNoDefinitionApiData } from './MetafieldGraphQlModel';

// #endregion

// #region Types
export interface GraphQlApiDataWithMetafields extends BaseApiDataGraphQl {
  metafields?: { nodes: MetafieldNoDefinitionApiData[] };
}

export interface BaseModelDataGraphQlWithMetafields extends BaseModelDataGraphQl {
  metafields: MetafieldGraphQlModel[] | null;
}
// #endregion

export abstract class AbstractModelGraphQlWithMetafields extends AbstractModelGraphQl {
  public data: BaseModelDataGraphQlWithMetafields;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource;
  public static readonly metafieldGraphQlOwnerType: MetafieldOwnerType;

  public async syncMetafields(): Promise<void> {
    const metafieldsResponse = await MetafieldGraphQlClient.createInstance(this.context).list({
      ownerIds: [this.data[this.primaryKey]],
    });
    this.data.metafields = metafieldsResponse.body.map((d) => MetafieldGraphQlModel.createInstance(this.context, d));
  }

  public async saveMetafields(): Promise<void> {
    await Promise.all(this.data.metafields.map(async (metafield) => metafield.save()));
  }

  protected setData(
    data: BaseModelDataGraphQl & {
      metafields?: { nodes: MetafieldNoDefinitionApiData[] };
    }
  ): void {
    super.setData(data);
    this.data.metafields = data.metafields?.nodes
      ? data.metafields.nodes.map((d) =>
          MetafieldGraphQlModel.createInstance(this.context, {
            ...d,
            parentNode: { id: this.data[this.primaryKey] },
          } as MetafieldModelData)
        )
      : [];
  }

  public async save() {
    const isUpdate = !!this.data[this.primaryKey];
    const metafields = this.data.metafields;
    await super.save();

    if (metafields) {
      /**
       * Que ce soit lors d'une update ou d'une creation, les metafields ont été
       * effacés par this.setData() car aucune des deux réponses ne renvoit de
       * metafields. On remet donc les metafields a leur valeur théorique
       *
       * Assume metafields have been correctly created if no error is thrown
       */
      this.data.metafields = metafields;

      // If we did an update, metafiields are not saved yet
      if (isUpdate) {
        await this.saveMetafields();
      }
    }
  }
}
