import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { TadaDocumentNode } from 'gql.tada';
import { ResultOf, VariablesOf } from '../../utils/graphql';

import { GRAPHQL_DEFAULT_API_VERSION, GRAPHQL_RETRIES__MAX } from '../../config/config';
import { GRAPHQL_NODES_LIMIT } from '../../constants';
import { PageInfo } from '../../types/admin.types';
import { arrayUnique, getShopifyRequestHeaders, isCodaCached, logAdmin, wait } from '../../utils/helpers';
import { FetchRequestOptions } from '../Fetcher.types';
import {
  GraphQLMaxCostExceededError,
  GraphQLThrottledError,
  ShopifyGraphQlError,
  ShopifyGraphQlErrorCode,
  ShopifyGraphQlMaxCostExceededError,
  ShopifyGraphQlRequestCost,
  ShopifyGraphQlThrottledError,
  ShopifyGraphQlUserError,
  ShopifyThrottledErrorCode,
} from './GraphQLError';

// #region Types
interface GraphQlPayload {
  query: string;
  variables?: {
    [key: string]: any;
    maxEntriesPerRun?: number;
  };
}

interface GraphQlData<TadaT extends TadaDocumentNode> {
  data: ResultOf<TadaT>;
  errors: any;
  extensions: {
    cost: ShopifyGraphQlRequestCost;
  };
}

type GraphQlCodaFetchResponse<TadaT extends TadaDocumentNode> = coda.FetchResponse<GraphQlData<TadaT>>;

export interface GraphQlRequestReturn<TadaT extends TadaDocumentNode> {
  body: GraphQlCodaFetchResponse<TadaT>['body'];
  headers: GraphQlCodaFetchResponse<TadaT>['headers'];
  retries: number;
  cost: ShopifyGraphQlRequestCost;
  // lastMaxEntriesPerRun?: number;
  pageInfo?: PageInfo;
}

interface GraphQlRequestParams<NodeT extends TadaDocumentNode> {
  documentNode: NodeT;
  variables: VariablesOf<NodeT>;
  /** The current number of retries. */
  retries?: number;

  options?: Omit<FetchRequestOptions, 'url'>;
}

// #endregion

interface GraphQlClientParams {
  context: coda.ExecutionContext;
  apiVersion?: string;
}

export class GraphQlClientNEW {
  private static DEFAULT_LIMIT = '250';
  private static RETRY_WAIT_TIME = 1000;
  private static MAX_RETRIES = GRAPHQL_RETRIES__MAX;

  protected readonly context: coda.ExecutionContext;
  readonly apiVersion: string;

  constructor({ context, apiVersion = GRAPHQL_DEFAULT_API_VERSION }: GraphQlClientParams) {
    this.context = context;
    this.apiVersion = apiVersion;
  }

  /**
   * Repay graphQL query cost to avoid throttled status.
   *
   * It calculates the waiting time based on the actualQueryCost and the restore
   * rate, then applies the delay.
   *
   * @param cost - The cost property of the query being requested.
   * @param throttled - If the query was throttled, we repay all points to reach maximumAvailable as a safety measure
   */
  private static async repayCost(cost: ShopifyGraphQlRequestCost, throttled?: boolean) {
    const { actualQueryCost, requestedQueryCost } = cost;
    const { restoreRate, maximumAvailable, currentlyAvailable } = cost.throttleStatus;

    let waitMs = 0;
    let msg = '';
    if (throttled) {
      // restore all points
      waitMs = ((maximumAvailable - currentlyAvailable) / restoreRate) * 1000;
      msg = `⏳ TROTTLED : restore all points by waiting ${waitMs / 1000}s`;
    } else {
      waitMs = (actualQueryCost / restoreRate) * 1000;
      msg = `⏳ Repay cost (${actualQueryCost}) by waiting ${waitMs / 1000}s`;
    }

    if (waitMs > 0) {
      console.log(msg);
      return wait(waitMs);
    }
  }

  private static formatUserError(userError: ShopifyGraphQlUserError): string {
    return `${userError.code ? userError.code + ': ' : ''}${userError.message}`;
  }

  private static formatError(error: ShopifyGraphQlError): string {
    return error.message;
  }

  private static formatErrorMessages(messages: Array<string>): string {
    return arrayUnique(messages.map((msg) => `• ${msg}`)).join('\n\n');
  }

  private static getPageInfo<NodeT extends TadaDocumentNode>(body: GraphQlData<NodeT>): PageInfo | undefined {
    for (const key in body.data) {
      if (body.data[key].pageInfo) {
        return body.data[key].pageInfo;
      }
    }
  }

  private static findUserErrors<NodeT extends TadaDocumentNode>(body: GraphQlData<NodeT>) {
    let err: Array<ShopifyGraphQlUserError> = [];
    if (body.data) {
      Object.keys(body.data).forEach((key) => {
        if (body.data[key]?.userErrors) {
          err = err.concat(body.data[key].userErrors);
        }
      });
    }
    return err;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get apiUrl() {
    return `${this.context.endpoint}/admin/api/${this.apiVersion}/graphql.json`;
  }

  /**
   * Validates the number of retries and logs retry count if retries are greater than 0.
   * Throws an error if the maximum number of retries is exceeded.
   * @param retries The current number of retries
   */
  private validateAndLogRetries(retries: number) {
    if (retries > 0) {
      logAdmin(`🔄 Retrying (count: ${retries})...`);
    }
    if (retries > GraphQlClientNEW.MAX_RETRIES) {
      throw new coda.UserVisibleError(`Max retries (${GraphQlClientNEW.MAX_RETRIES}) of GraphQL requests exceeded.`);
    }
  }

  private static findErrorByCode<CodeT extends ShopifyGraphQlErrorCode>(
    errors: ShopifyGraphQlError[],
    code: CodeT
  ): CodeT extends ShopifyThrottledErrorCode
    ? ShopifyGraphQlThrottledError
    : ShopifyGraphQlMaxCostExceededError | undefined {
    return errors.find((error) => 'extensions' in error && error.extensions?.code === code);
  }

  private getFetchRequest<NodeT extends TadaDocumentNode>(
    documentNode: NodeT,
    variables: VariablesOf<NodeT>,
    options: GraphQlRequestParams<NodeT>['options']
  ): coda.FetchRequest {
    let cacheTtlSecs = 0;
    let forceCache = false;

    if (options?.cacheTtlSecs !== undefined) {
      cacheTtlSecs = options.cacheTtlSecs;
      forceCache = true;
    }

    return {
      method: 'POST',
      url: this.apiUrl,
      headers: getShopifyRequestHeaders(this.context),
      body: JSON.stringify({
        query: printGql(documentNode),
        variables,
      }),
      cacheTtlSecs,
      forceCache,
    };
  }

  private throwOnErrors<NodeT extends TadaDocumentNode>(response: GraphQlCodaFetchResponse<NodeT>) {
    const { errors, extensions } = response.body;
    const userErrors = GraphQlClientNEW.findUserErrors<NodeT>(response.body);

    if (userErrors.length) {
      throw new coda.UserVisibleError(
        GraphQlClientNEW.formatErrorMessages(userErrors.map(GraphQlClientNEW.formatUserError))
      );
    }

    // if (true) {
    if (errors) {
      const testShopifyGraphQlError = {
        locations: [
          {
            line: 12,
            column: 12,
          },
        ],
        message: 'test ShopifyGraphQlError',
        path: ['ath path path'],
        extensions: {
          code: 'MAX_COST_EXCEEDED',
          typeName: 'bogus',
          fieldName: 'bogus',
          cost: 5000,
          maxCost: 2000,
        },
      };
      // errors = [testShopifyGraphQlError];

      const maxCostError = GraphQlClientNEW.findErrorByCode(errors, 'MAX_COST_EXCEEDED');
      if (maxCostError) throw new GraphQLMaxCostExceededError(maxCostError);

      const throttledError = GraphQlClientNEW.findErrorByCode(errors, 'THROTTLED');
      if (throttledError) throw new GraphQLThrottledError(throttledError, extensions.cost);

      throw new coda.UserVisibleError(
        'GraphQL request failed: ' + GraphQlClientNEW.formatErrorMessages(errors.map(GraphQlClientNEW.formatError))
      );
    }
  }

  private adjustMaxEntriesInVariables<VarT extends VariablesOf<TadaDocumentNode>>(
    maxCostError: GraphQLMaxCostExceededError,
    variables: VarT
  ): VarT {
    const { maxCost, cost } = maxCostError;
    const diminishingFactor = 0.75;
    const reducedMaxEntriesPerRun = Math.min(
      GRAPHQL_NODES_LIMIT,
      Math.max(1, Math.floor((maxCost / cost) * variables.maxEntriesPerRun * diminishingFactor))
    );
    return {
      ...variables,
      maxEntriesPerRun: reducedMaxEntriesPerRun,
    };
  }

  private async handleRetryForThrottledError<NodeT extends TadaDocumentNode>(
    throttledError: GraphQLThrottledError,
    response: GraphQlCodaFetchResponse<NodeT>,
    params: GraphQlRequestParams<NodeT>
  ): Promise<GraphQlRequestReturn<NodeT>> {
    const { retries = 0 } = params;
    const isCachedResponse = isCodaCached(response);
    const isSyncContext = !!this.context.sync;

    /* Repay cost for non cached responses */
    if (!isCachedResponse) {
      await GraphQlClientNEW.repayCost(throttledError.cost, true);
    }

    // TODO: ça pose un probleme avec le cursor
    // if (isSyncContext) {
    //   /* Signal the end of the current sync in a Sync Table context to avoid timeout */
    //   return { body: response.body, headers: response.headers, retries: retries + 1, pageInfo: response.pageInfo };
    // } else {
    /* We are doing a normal request. Retry immediately */
    return this.request({ ...params, retries: retries + 1 });
    // }
  }
  private async handleRetryForMaxCostExceededError<NodeT extends TadaDocumentNode>(
    maxCosterror: GraphQLMaxCostExceededError,
    params: GraphQlRequestParams<NodeT>
  ): Promise<GraphQlRequestReturn<NodeT>> {
    const { retries = 0, variables } = params;
    const adjustedVariables = this.adjustMaxEntriesInVariables(maxCosterror, variables);
    console.log(
      `⛔️ ${maxCosterror.message} maxCost is ${maxCosterror.maxCost} while cost is ${maxCosterror.cost}. Adjusting next query to run with ${adjustedVariables.maxEntriesPerRun} max entries.`
    );
    return this.request({ ...params, variables: adjustedVariables, retries: retries + 1 });
  }

  public async request<NodeT extends TadaDocumentNode>(
    params: GraphQlRequestParams<NodeT>
  ): Promise<GraphQlRequestReturn<NodeT>> {
    const { context } = this;
    const { documentNode, variables, retries = 0, options } = params;
    let currRetries = retries;
    let response: GraphQlCodaFetchResponse<NodeT>;

    try {
      this.validateAndLogRetries(currRetries);

      response = await context.fetcher.fetch(this.getFetchRequest(documentNode, variables, options));
      console.log('variables', variables);

      console.log('——————— isCodaCached', isCodaCached(response));

      this.throwOnErrors(response);

      // Always repay cost
      if (!isCodaCached(response) && response.body.extensions?.cost) {
        await GraphQlClientNEW.repayCost(response.body.extensions.cost);
      }
      return {
        body: response.body,
        headers: response.headers,
        pageInfo: GraphQlClientNEW.getPageInfo(response.body),
        retries: 0, // reset retries counter because we just got a full response
        cost: response.body.extensions.cost,
        // lastMaxEntriesPerRun: variables.maxEntriesPerRun ?? 1,
      };
    } catch (error) {
      if (error instanceof GraphQLThrottledError) {
        return this.handleRetryForThrottledError<NodeT>(error, response, params);
      }

      // TODO: check all requests use maxEntriesPerRun variable
      if (error instanceof GraphQLMaxCostExceededError && variables?.maxEntriesPerRun) {
        return this.handleRetryForMaxCostExceededError<NodeT>(error, params);
      }

      throw error;
    }
  }
}
