// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../utils/graphql';

import { print as printGql } from '@0no-co/graphql.web';
import { GraphQlPayload, GraphQlResponse, makeGraphQlRequest } from '../helpers-graphql';
import { ResourceUnion } from '../resources/Resource.types';
import { FetchRequestOptions, ShopifyGraphQlUserError } from './Fetcher.types';
import { PageInfo } from '../types/admin.types';
import { TadaDocumentNode } from 'gql.tada';

// #endregion

// #region type
export interface graphQlFetchParams {
  gid: string;
}
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

  async makeRequest<TadaT extends TadaDocumentNode>(
    documentNode: TadaT,
    variables: VariablesOf<TadaT>,
    requestOptions: FetchRequestOptions = {}
  ) {
    const { response } = await makeGraphQlRequest<ResultOf<TadaT>>(
      {
        ...requestOptions,

        payload: {
          query: printGql(documentNode),
          variables,
        },
        getUserErrors: ClientGraphQl.findUserErrors,
      },
      this.context
    );
    return response;
  }
}
