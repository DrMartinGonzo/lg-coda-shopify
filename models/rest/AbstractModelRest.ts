// #region Imports

import { FetchRequestOptions } from '../../Clients/Client.types';
import { IRestClient, RestRequestReturn } from '../../Clients/RestApiClientBase';
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

  abstract get client(): IRestClient;

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
    const apiData = this.getApiData();
    if (isUpdate) {
      response = await this.client.update(apiData);
    } else {
      response = await this.client.create(apiData);
    }
    if (response) {
      this.setData(response.body);
    }
  }

  public async delete() {
    await this.client.delete(this.getApiData());
  }
}
