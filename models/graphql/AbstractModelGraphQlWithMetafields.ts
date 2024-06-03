// #region Imports
import { ResultOf } from '../../utils/tada-utils';

import { AbstractModelGraphQl, BaseModelDataGraphQl, BaseApiDataGraphQl } from './AbstractModelGraphQl';
import { MetafieldApidata, MetafieldGraphQlModel } from './MetafieldGraphQlModel';

import { MetafieldClient as MetafieldGraphQlClient } from '../../Clients/GraphQlApiClientBase';

import { SupportedMetafieldOwnerResource } from '../../Resources/Rest/Metafield';
import { MetafieldOwnerType } from '../../types/admin.types';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { metafieldFieldsFragment } from '../../graphql/metafields-graphql';

// #endregion

// #region Types
export interface GraphQlApiDataWithMetafields extends BaseApiDataGraphQl {
  metafields?: { nodes: ResultOf<typeof metafieldFieldsFragment>[] };
}

export interface BaseModelDataGraphQlWithMetafields extends BaseModelDataGraphQl {
  metafields: MetafieldGraphQlModel[] | null;
}
// #endregion

export abstract class AbstractModelGraphQlWithMetafields<T> extends AbstractModelGraphQl<T> {
  public data: BaseModelDataGraphQlWithMetafields;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource;
  public static readonly metafieldGraphQlOwnerType: MetafieldOwnerType;

  public async syncMetafields(): Promise<void> {
    const staticResource = this.asStatic<typeof AbstractModelGraphQlWithMetafields>();
    const metafieldsResponse = await MetafieldGraphQlClient.createInstance(this.context).list({
      ownerIds: [idToGraphQlGid(staticResource.graphQlName, this.data.id)],
    });
    this.data.metafields = metafieldsResponse.body.map((d) => MetafieldGraphQlModel.createInstance(this.context, d));
  }

  public async saveMetafields(): Promise<void> {
    await Promise.all(this.data.metafields.map(async (metafield) => metafield.save()));
  }

  protected setData(data: GraphQlApiDataWithMetafields): void {
    super.setData(data);
    this.data.metafields = data.metafields?.nodes
      ? data.metafields.nodes.map((d) =>
          MetafieldGraphQlModel.createInstance(this.context, {
            ...d,
            parentNode: { id: this.data[this.primaryKey] },
          } as MetafieldApidata)
        )
      : [];
  }

  public async save() {
    const isUpdate = this.data[this.primaryKey];
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
