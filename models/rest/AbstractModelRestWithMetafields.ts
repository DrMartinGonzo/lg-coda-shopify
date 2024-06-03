// #region Imports

import { AbstractModelRest, BaseApiDataRest, BaseModelDataRest } from './AbstractModelRest';
import { MetafieldGraphQlModel } from '../graphql/MetafieldGraphQlModel';
import { MetafieldApiData, MetafieldModel, MetafieldModelData } from './MetafieldModel';

import { MetafieldClient as MetafieldGraphQlClient } from '../../Clients/GraphQlApiClientBase';
import { MetafieldClient, RestRequestReturn } from '../../Clients/RestApiClientBase';

import { SupportedMetafieldOwnerResource } from '../../Resources/Rest/Metafield';
import { MetafieldOwnerType } from '../../types/admin.types';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { GraphQlResourceName } from '../../Resources/types/SupportedResource';
import { Serialized } from '../AbstractModel';

// #endregion

// #region Types
export interface BaseModelDataRestWithRestMetafields extends BaseModelDataRest {
  metafields: MetafieldModel[] | null;
}
export interface BaseModelDataRestWithGraphQlMetafields extends BaseModelDataRest {
  metafields: MetafieldGraphQlModel[] | null;
}
// #endregion

export abstract class AbstractModelRestWithMetafields<T> extends AbstractModelRest<T> {
  public data: BaseModelDataRestWithRestMetafields;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource;
  public static readonly metafieldGraphQlOwnerType: MetafieldOwnerType;

  public async syncMetafields(): Promise<void> {
    const staticResource = this.asStatic<typeof AbstractModelRestWithMetafields>();
    const metafieldsResponse = await MetafieldClient.createInstance(this.context).list({
      owner_id: this.data[this.primaryKey],
      owner_resource: staticResource.metafieldRestOwnerType,
    });
    this.data.metafields = metafieldsResponse.body.map((d) => MetafieldModel.createInstance(this.context, d));
  }

  public async saveMetafields(): Promise<void> {
    await Promise.all(this.data.metafields.map(async (metafield) => metafield.save()));
  }

  public async save() {
    let response: RestRequestReturn<BaseApiDataRest>;
    const serializedData = this.serializedData as Serialized<BaseModelDataRestWithRestMetafields>;
    const metafieldInstances = this.data.metafields;

    const isUpdate = this.data[this.primaryKey];
    if (isUpdate) {
      /** Il faut séparer les metafields de l'objet d'origine pour ne pas les
       * sauvegarder lors d'une update. Ils seront sauvegardés séparément */
      const { metafields, ...data } = serializedData;
      response = await this.client.update(data);
    } else {
      response = await this.client.create(serializedData);
    }
    if (response) {
      this.setData(response.body);
    }

    if (metafieldInstances) {
      /**
       * Que ce soit lors d'une update ou d'une creation, les metafields ont été
       * effacés par this.setData() car aucune des deux réponses ne renvoit de
       * metafields. On remet donc les metafields a leur valeur théorique
       *
       * Assume metafields have been correctly created if no error is thrown
       */
      this.data.metafields = metafieldInstances;

      // If we did an update, metafiields are not saved yet
      if (isUpdate) {
        await this.saveMetafields();
      }
    }
  }
}

export abstract class AbstractRestModelWithGraphQlMetafields<T> extends AbstractModelRest<T> {
  public data: BaseModelDataRestWithGraphQlMetafields;

  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource;
  public static readonly metafieldGraphQlOwnerType: MetafieldOwnerType;
  protected static readonly graphQlName: GraphQlResourceName;

  public async syncMetafields(): Promise<void> {
    const metafieldsResponse = await MetafieldGraphQlClient.createInstance(this.context).list({
      ownerIds: [this.graphQlGid],
    });
    this.data.metafields = metafieldsResponse.body.map((d) => MetafieldGraphQlModel.createInstance(this.context, d));
  }

  // public async saveMetafields(): Promise<void> {
  //   await Promise.all(this.data.metafields.map(async (metafield) => metafield.save()));
  // }

  // TODO: dedupe
  // public async save() {
  //   let response: RestRequestReturn<BaseApiDataRest>;
  //   const serializedData = this.serializedData as Serialized<BaseModelDataRestWithRestMetafields>;
  //   const metafieldInstances = this.data.metafields;

  //   const isUpdate = this.data[this.primaryKey];
  //   if (isUpdate) {
  //     /** Il faut séparer les metafields de l'objet d'origine pour ne pas les
  //      * sauvegarder lors d'une update. Ils seront sauvegardés séparément */
  //     const { metafields, ...data } = serializedData;
  //     response = await this.client.update(data);
  //   } else {
  //     response = await this.client.create(this.serializedData);
  //   }
  //   if (response) {
  //     this.setData(response.body);
  //   }

  //   if (metafieldInstances) {
  //     /**
  //      * Que ce soit lors d'une update ou d'une creation, les metafields ont été
  //      * effacés par this.setData() car aucune des deux réponses ne renvoit de
  //      * metafields. On remet donc les metafields a leur valeur théorique
  //      *
  //      * Assume metafields have been correctly created if no error is thrown
  //      */
  //     this.data.metafields = metafieldInstances;

  //     // If we did an update, metafiields are not saved yet
  //     if (isUpdate) {
  //       await this.saveMetafields();
  //     }
  //   }
  // }
}
