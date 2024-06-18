// #region Imports

import { AbstractRestClient, RestRequestReturn } from '../../Clients/RestClients';
import { GraphQlResourceName } from '../../constants/resourceNames-constants';
import { CACHE_DISABLED } from '../../constants/cacheDurations-constants';
import { idToGraphQlGid } from '../../graphql/utils/graphql-utils';
import { AbstractModel, BaseModelData } from '../AbstractModel';

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
export abstract class AbstractModelRest extends AbstractModel {
  public data: BaseApiDataRest;
  protected static readonly graphQlName: GraphQlResourceName;

  abstract get client(): AbstractRestClient<any, any, any, any>;

  get graphQlGid(): string {
    if ('admin_graphql_api_id' in this.data) {
      return this.data.admin_graphql_api_id as string;
    }
    return idToGraphQlGid((this.asStatic() as typeof AbstractModelRest).graphQlName, this.data[this.primaryKey]);
  }

  protected async getFullFreshData(): Promise<BaseModelDataRest | undefined> {
    if (this.data[this.primaryKey]) {
      const found = await this.client.single({
        id: this.data[this.primaryKey],
        options: { cacheTtlSecs: CACHE_DISABLED },
      });
      return found ? found.body : undefined;
    }
  }

  public async save(): Promise<void> {
    let response: RestRequestReturn<BaseApiDataRest>;
    const isUpdate = !!this.data[this.primaryKey];
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
