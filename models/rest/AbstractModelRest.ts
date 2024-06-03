// #region Imports

import { FetchRequestOptions } from '../../Clients/Client.types';
import { IRestCRUD, RestRequestReturn } from '../../Clients/RestApiClientBase';
import { GraphQlResourceName } from '../../Resources/types/SupportedResource';
import { CACHE_DISABLED } from '../../constants';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { AbstractModel, BaseModelData, Serialized } from '../AbstractModel';

// #endregion

// #region Types
export interface BaseApiDataRest {
  id: number | null;
}
export interface BaseModelDataRest extends BaseModelData {
  id: number;
}
// #endregion

// TODO: implement readOnlyAttributes
export abstract class AbstractModelRest<T> extends AbstractModel<T> {
  public data: BaseApiDataRest;
  protected static readonly graphQlName: GraphQlResourceName;

  abstract get client(): IRestCRUD;

  get graphQlGid(): string {
    if ('admin_graphql_api_id' in this.data) {
      return this.data.admin_graphql_api_id as string;
    }
    return idToGraphQlGid((this.asStatic() as typeof AbstractModelRest).graphQlName, this.data[this.primaryKey]);
  }

  protected async getFullFreshData(): Promise<BaseApiDataRest | undefined> {
    const options: FetchRequestOptions = { cacheTtlSecs: CACHE_DISABLED };
    if (this.data[this.primaryKey]) {
      const found = await this.client.single({ id: this.data[this.primaryKey], options });
      return found ? found.body : undefined;
    }
  }

  public async save() {
    let response: RestRequestReturn<BaseApiDataRest>;
    const isUpdate = this.data[this.primaryKey];
    if (isUpdate) {
      response = await this.client.update(this.serializedData);
    } else {
      response = await this.client.create(this.serializedData);
    }
    if (response) {
      this.setData(response.body);
    }
  }

  public async delete() {
    await this.client.delete(this.serializedData);
  }

  protected get serializedData(): Serialized<any> {
    function process(prop: any) {
      if (prop instanceof AbstractModelRest) {
        return prop.serializedData;
      }
      if (Array.isArray(prop)) {
        return prop.map(process);
      }
      return prop;
    }

    const ret = {};
    for (let key in this.data) {
      const prop = this.data[key];
      ret[key] = process(prop);
    }
    return ret as Serialized<any>;
  }
}
