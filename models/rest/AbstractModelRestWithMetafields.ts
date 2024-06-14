// #region Imports

import { MetafieldGraphQlModel } from '../graphql/MetafieldGraphQlModel';
import { AbstractModelRest, BaseApiDataRest, BaseModelDataRest } from './AbstractModelRest';
import { MetafieldModel } from './MetafieldModel';

import { MetafieldClient as MetafieldGraphQlClient } from '../../Clients/GraphQlClients';
import { MetafieldClient, RestRequestReturn } from '../../Clients/RestClients';

import { GraphQlResourceName } from '../../constants/resourceNames-constants';
import { MetafieldOwnerType } from '../../types/admin.types';
import { SupportedMetafieldOwnerResource } from './MetafieldModel';

// #endregion

// #region Types
interface BaseModelDataRestWithMetafields extends BaseModelDataRest {
  metafields: MetafieldModel[] | MetafieldGraphQlModel[] | null;
}
export interface BaseModelDataRestWithRestMetafields extends BaseModelDataRestWithMetafields {
  metafields: MetafieldModel[] | null;
}
export interface BaseModelDataRestWithGraphQlMetafields extends BaseModelDataRestWithMetafields {
  metafields: MetafieldGraphQlModel[] | null;
}
// #endregion

abstract class AbstractModelRestWithMetafields extends AbstractModelRest {
  public data: BaseModelDataRestWithMetafields;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource;
  public static readonly metafieldGraphQlOwnerType: MetafieldOwnerType;

  public abstract syncMetafields(): Promise<void>;

  public async saveMetafields(): Promise<void> {
    await Promise.all(
      this.data.metafields.map(async (metafield: MetafieldModel | MetafieldGraphQlModel) => metafield.save())
    );
  }

  public async save() {
    let response: RestRequestReturn<BaseApiDataRest>;
    const apiData = this.getApiData<BaseModelDataRestWithMetafields>();
    const metafieldInstances = this.data.metafields;

    const isUpdate = this.data[this.primaryKey];
    if (isUpdate) {
      /** Il faut séparer les metafields de l'objet d'origine pour ne pas les
       * sauvegarder lors d'une update. Ils seront sauvegardés séparément */
      const { metafields, ...data } = apiData;
      response = await this.client.update(data);
    } else {
      response = await this.client.create(apiData);
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

export abstract class AbstractModelRestWithRestMetafields extends AbstractModelRestWithMetafields {
  public data: BaseModelDataRestWithRestMetafields;

  public async syncMetafields(): Promise<void> {
    const staticResource = this.asStatic<typeof AbstractModelRestWithRestMetafields>();
    const metafieldsResponse = await MetafieldClient.createInstance(this.context).list({
      owner_id: this.data[this.primaryKey],
      owner_resource: staticResource.metafieldRestOwnerType,
    });
    this.data.metafields = metafieldsResponse.body.map((d) => MetafieldModel.createInstance(this.context, d));
  }
}

export abstract class AbstractModelRestWithGraphQlMetafields extends AbstractModelRestWithMetafields {
  public data: BaseModelDataRestWithGraphQlMetafields;
  protected static readonly graphQlName: GraphQlResourceName;

  public async syncMetafields(): Promise<void> {
    const metafieldsResponse = await MetafieldGraphQlClient.createInstance(this.context).list({
      ownerIds: [this.graphQlGid],
    });
    this.data.metafields = metafieldsResponse.body.map((d) => MetafieldGraphQlModel.createInstance(this.context, d));
  }
}
