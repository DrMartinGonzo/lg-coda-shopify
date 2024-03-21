// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../utils/graphql';

import { print as printGql } from '@0no-co/graphql.web';
import { GraphQlResponse, makeGraphQlRequest } from '../helpers-graphql';
import { ResourceUnion } from '../resources/Resource.types';
import { FetchRequestOptions, ShopifyGraphQlUserError } from './Fetcher.types';
import { PageInfo } from '../types/admin.types';

// #endregion

export abstract class ClientGraphQl<ResourceT extends ResourceUnion> {
  readonly resource: ResourceT;
  readonly context: coda.ExecutionContext;
  readonly schema: ResourceT['schema'];

  constructor(resource: ResourceT, context: coda.ExecutionContext) {
    this.resource = resource;
    this.context = context;
  }

  static findUserErrors(body: GraphQlResponse<any>) {
    let err: Array<ShopifyGraphQlUserError> = [];
    Object.keys(body.data).forEach((key) => {
      if (body.data[key].userErrors) {
        err = err.concat(body.data[key].userErrors);
      }
    });
    return err;
  }

  static getPageInfo(body: GraphQlResponse<any>): PageInfo | undefined {
    for (const key in body.data) {
      if (body.data[key].pageInfo) {
        return body.data[key].pageInfo;
      }
    }
  }

  validateParams = (params: any): Boolean => true;

  formatRowToApi(row: any, metafieldKeyValueSets: any[] = []) {
    return {};
  }

  // formatApiToRow = (restData: any) => ({});

  abstract formatApiToRow(data: any): ResourceT['codaRow'];

  formatFetchPayload() {}

  formatUpdatePayload() {}

  async makeRequest<actionT extends string>(
    action: actionT,
    variables: VariablesOf<ResourceT['graphQl']['operations'][actionT]>,
    requestOptions: FetchRequestOptions = {}
  ) {
    const { response } = await makeGraphQlRequest<ResultOf<ResourceT['graphQl']['operations'][actionT]>>(
      {
        ...requestOptions,
        // cacheTtlSecs: requestOptions.cacheTtlSecs ?? action === 'fetchSingle' ? CACHE_DEFAULT : undefined,
        payload: {
          query: printGql(this.resource.graphQl.operations[action]),
          variables,
        },
        getUserErrors: ClientGraphQl.findUserErrors,
      },
      this.context
    );
    return response;
  }
}
