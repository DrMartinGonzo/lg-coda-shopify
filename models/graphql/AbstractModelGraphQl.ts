// #region Imports

import { AbstractGraphQlClient, GraphQlRequestReturn } from '../../Clients/GraphQlClients';
import { GraphQlResourceName } from '../types/SupportedResource';
import { CACHE_DISABLED } from '../../constants';
import { Node } from '../../types/admin.types';
import { graphQlGidToId } from '../../graphql/utils/graphql-utils';
import { AbstractModel } from '../AbstractModel';

// #endregion

// #region Types
export interface BaseApiDataGraphQl extends Node {}

export interface BaseModelDataGraphQl {
  /** A globally-unique ID. */
  id: string;
}
// #endregion

export abstract class AbstractModelGraphQl extends AbstractModel {
  public data: BaseModelDataGraphQl;
  protected static readonly graphQlName: GraphQlResourceName;

  abstract get client(): AbstractGraphQlClient<any>;

  get graphQlGid(): string {
    return this.data[this.primaryKey];
  }
  get restId(): number {
    return graphQlGidToId(this.graphQlGid);
  }

  protected async getFullFreshData(): Promise<BaseModelDataGraphQl | undefined> {
    if (this.data[this.primaryKey]) {
      const found: GraphQlRequestReturn<BaseModelDataGraphQl> = await this.client.single({
        id: this.data[this.primaryKey],
        forceAllFields: true,
        options: { cacheTtlSecs: CACHE_DISABLED },
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
