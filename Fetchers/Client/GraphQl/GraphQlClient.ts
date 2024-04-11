// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf } from '../../../utils/graphql';

import { print as printGql } from '@0no-co/graphql.web';
import { TadaDocumentNode } from 'gql.tada';
import { getGraphQlSyncTableMaxEntriesAndDeferWait, makeGraphQlRequest } from '../../../helpers-graphql';
import { ResourceUnion } from '../../../resources/Resource.types';
import { PageInfo } from '../../../types/admin.types';
import { wait } from '../../../utils/helpers';
import { FetchRequestOptions, IClient } from '../../Fetcher.types';
import { SyncTableGraphQlContinuation, SyncTableGraphQlExtraContinuationData } from '../../SyncTable/SyncTable.types';
import { stringifyContinuationProperty } from '../../fetcher-helpers';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlUserError } from '../../NEW/GraphQLError';

// #endregion

// #region type
export type GraphQlData<Data extends any> = {
  data: Data;
  errors: any;
  extensions: {
    cost: ShopifyGraphQlRequestCost;
  };
};

export type GraphQlFetchTadaResponse<TadaT extends TadaDocumentNode> = coda.FetchResponse<GraphQlData<ResultOf<TadaT>>>;
// #endregion

export abstract class GraphQlClient<ResourceT extends ResourceUnion> implements IClient {
  readonly resource: ResourceT;
  readonly context: coda.ExecutionContext;

  constructor(resource: ResourceT, context: coda.ExecutionContext) {
    this.resource = resource;
    this.context = context;
  }

  static findUserErrors(body: GraphQlData<any>) {
    let err: Array<ShopifyGraphQlUserError> = [];
    Object.keys(body.data).forEach((key) => {
      if (body.data[key].userErrors) {
        err = err.concat(body.data[key].userErrors);
      }
    });
    return err;
  }

  static getPageInfo(body: GraphQlData<any>): PageInfo | undefined {
    for (const key in body.data) {
      if (body.data[key].pageInfo) {
        return body.data[key].pageInfo;
      }
    }
  }

  async fetchData<TadaT extends TadaDocumentNode>(
    documentNode: TadaT,
    variables: VariablesOf<TadaT>,
    requestOptions: FetchRequestOptions = {},
    prevContinuation: SyncTableGraphQlContinuation = null,
    extraContinuationData: SyncTableGraphQlExtraContinuationData = {}
  ) {
    let continuation: SyncTableGraphQlContinuation = null;

    const defaultMaxEntriesPerRun = variables.maxEntriesPerRun ?? 50;
    const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
      defaultMaxEntriesPerRun,
      prevContinuation,
      this.context
    );
    if (shouldDeferBy > 0) {
      await wait(shouldDeferBy);
      return {
        response: undefined,
        continuation: { ...prevContinuation, graphQlLock: 'false' },
      };

      // TODO: fix `any` type
      // return skipGraphQlSyncTableRun(prevContinuation as any, shouldDeferBy);
    }

    // @ts-ignore
    variables.maxEntriesPerRun = maxEntriesPerRun;
    if (prevContinuation?.cursor) {
      // @ts-ignore
      variables.cursor = prevContinuation.cursor;
    }

    // TODO
    const { response, retries } = await this.makeRequest(
      documentNode,
      variables,
      requestOptions,
      prevContinuation?.retries
    );

    const pageInfo = GraphQlClient.getPageInfo(response.body);
    const hasNextRun = retries > 0 || (pageInfo && pageInfo.hasNextPage);

    if (hasNextRun) {
      continuation = {
        graphQlLock: 'true',
        retries,
        extraContinuationData: extraContinuationData,
      };

      if (pageInfo && pageInfo.hasNextPage) {
        continuation = {
          ...continuation,
          cursor: pageInfo.endCursor,
        };
      }
      if (response.body.extensions?.cost) {
        continuation = {
          ...continuation,
          lastCost: stringifyContinuationProperty(response.body.extensions.cost),
          lastMaxEntriesPerRun: maxEntriesPerRun,
        };
      }
    }

    return {
      response,
      continuation,
    };
  }

  protected async _fetchAllData<TadaT extends TadaDocumentNode>(
    documentNode: TadaT,
    variables: VariablesOf<TadaT>,
    requestOptions: FetchRequestOptions = {}
  ) {
    let dataArray: Array<ResultOf<TadaT>> = [];
    let prevContinuation: SyncTableGraphQlContinuation;
    let run = true;

    while (run) {
      const { response, continuation } = await this.fetchData(
        documentNode,
        variables,
        requestOptions,
        prevContinuation
      );

      if (response?.body?.data) {
        dataArray = dataArray.concat(response.body.data);
      }

      if (continuation?.cursor) {
        // TODO: fix 'as'
        prevContinuation = continuation as SyncTableGraphQlContinuation;
      } else {
        run = false;
      }
    }

    return dataArray;
  }

  protected async makeRequest<TadaT extends TadaDocumentNode>(
    documentNode: TadaT,
    variables: VariablesOf<TadaT>,
    requestOptions: FetchRequestOptions = {},
    currRetries?: number
  ) {
    const { response, retries } = await makeGraphQlRequest<TadaT>(
      {
        ...requestOptions,
        retries: currRetries ?? 0,
        payload: {
          query: printGql(documentNode),
          variables,
        },
        getUserErrors: GraphQlClient.findUserErrors,
      },
      this.context
    );
    // TODO: not sure que retourner les retries sert à quelques chose vu qu'on gere ça dans makeGraphQlRequest maintenant ?
    return { response, retries };
  }
}
