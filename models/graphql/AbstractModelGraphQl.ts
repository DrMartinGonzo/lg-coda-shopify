// #region Imports

import { FetchRequestOptions } from '../../Clients/Client.types';
import { GraphQlRequestReturn, IGraphQlCRUD } from '../../Clients/GraphQlApiClientBase';
import { GraphQlResourceName } from '../../Resources/types/SupportedResource';
import { CACHE_DISABLED } from '../../constants';
import { Node } from '../../types/admin.types';
import { graphQlGidToId } from '../../utils/conversion-utils';
import { AbstractModel } from '../AbstractModel';

// #endregion

// #region Types
export interface BaseApiDataGraphQl extends Node {}

export interface BaseModelDataGraphQl {
  id: string;
}
// #endregion

export abstract class AbstractModelGraphQl<T> extends AbstractModel<T> {
  public data: BaseModelDataGraphQl;
  protected static readonly graphQlName: GraphQlResourceName;

  abstract get client(): IGraphQlCRUD;

  get graphQlGid(): string {
    return this.data[this.primaryKey];
  }
  get restId(): number {
    return graphQlGidToId(this.graphQlGid);
  }

  protected async getFullFreshData(): Promise<BaseApiDataGraphQl | undefined> {
    const options: FetchRequestOptions = { cacheTtlSecs: CACHE_DISABLED };
    if (this.data[this.primaryKey]) {
      const found: GraphQlRequestReturn<BaseApiDataGraphQl> = await this.client.single({
        id: this.data[this.primaryKey],
        forceAllFields: true,
        options,
      });
      return found ? found.body : undefined;
    }
  }

  public async save(): Promise<void> {
    const isUpdate = this.data[this.primaryKey];
    const response = await (isUpdate ? this.client.update(this.data) : this.client.create(this.data));
    if (response) {
      this.setData(response.body);
    }
  }

  public async delete() {
    await this.client.delete(this.data);
  }
}