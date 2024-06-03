// #region Imports
import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { TadaDocumentNode } from 'gql.tada';
import { ResultOf, VariablesOf } from '../utils/tada-utils';

import { InvalidValueError } from '../Errors/Errors';
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
} from '../Errors/GraphQlErrors';
import { GRAPHQL_DEFAULT_API_VERSION, GRAPHQL_RETRIES__MAX } from '../config';
import { GRAPHQL_NODES_LIMIT } from '../constants';
import { PageInfo } from '../types/admin.types';
import { arrayUnique, dumpToConsole, logAdmin } from '../utils/helpers';
import { FetchRequestOptions } from './Client.types';
import { getShopifyRequestHeaders, isCodaCached, wait } from './utils/client-utils';

// #endregion

// Synctable doesn't handle retries, only GraphQLClient for simplicity
// Le seul probleme serait de dépasser le seuil de temps d'execution pour un run
// de synctable avec les temps d'attentes pour repayer le cout graphql, mais
// comme la requete graphql est elle même rapide, ça devrait passer ?

// #region Types
interface GraphQlData<NodeT extends TadaDocumentNode> {
  data: ResultOf<NodeT>;
  errors: any;
  extensions: {
    cost: ShopifyGraphQlRequestCost;
  };
}

type GraphQlCodaFetchResponse<NodeT extends TadaDocumentNode> = coda.FetchResponse<GraphQlData<NodeT>>;

export interface GraphQlRequestReturn<NodeT extends TadaDocumentNode> {
  body: GraphQlCodaFetchResponse<NodeT>['body'];
  headers: GraphQlCodaFetchResponse<NodeT>['headers'];
  cost: ShopifyGraphQlRequestCost;
  pageInfo?: PageInfo;
}

interface GraphQlRequestParams<NodeT extends TadaDocumentNode> {
  documentNode: NodeT;
  variables: VariablesOf<NodeT>;
  options?: FetchRequestOptions;
}

interface GraphQlClientParams {
  context: coda.ExecutionContext;
  apiVersion?: string;
}
// #endregion

export class GraphQlClient {
  private static RETRY_WAIT_TIME = 1000;
  private static MAX_RETRIES = GRAPHQL_RETRIES__MAX;
  private static MAX_LIMIT = GRAPHQL_NODES_LIMIT;

  private retries = 0;

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
    const { actualQueryCost, throttleStatus } = cost;
    const { restoreRate, maximumAvailable, currentlyAvailable } = throttleStatus;

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

  private static findErrorByCode<CodeT extends ShopifyGraphQlErrorCode>(errors: ShopifyGraphQlError[], code: CodeT) {
    return errors.find((error) => 'extensions' in error && error.extensions?.code === code) as
      | (CodeT extends ShopifyThrottledErrorCode ? ShopifyGraphQlThrottledError : ShopifyGraphQlMaxCostExceededError)
      | undefined;
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

    logAdmin('');
    logAdmin('—————————— GRAPHQL REQUEST CONTENT ——————————');
    logAdmin(
      documentNode.definitions
        .map((def) => {
          if ('name' in def) return `kind: ${def.kind}: ${def.name?.value}`;
        })
        .filter(Boolean)
        .join('\n')
    );
    // logAdmin(printGql(documentNode));
    dumpToConsole(variables);
    dumpToConsole(options);
    logAdmin('—————————————————————————————————————————————');
    logAdmin('');

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
    const userErrors = GraphQlClient.findUserErrors<NodeT>(response.body);

    if (userErrors.length) {
      throw new coda.UserVisibleError(GraphQlClient.formatErrorMessages(userErrors.map(GraphQlClient.formatUserError)));
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

      const maxCostError = GraphQlClient.findErrorByCode(errors, 'MAX_COST_EXCEEDED');
      if (maxCostError) throw new GraphQLMaxCostExceededError(maxCostError);

      const throttledError = GraphQlClient.findErrorByCode(errors, 'THROTTLED');
      if (throttledError) throw new GraphQLThrottledError(throttledError, extensions.cost);

      throw new coda.UserVisibleError(
        'GraphQL request failed: ' + GraphQlClient.formatErrorMessages(errors.map(GraphQlClient.formatError))
      );
    }
  }

  private adjustLimitInVariables<VariablesT extends VariablesOf<TadaDocumentNode>>(
    maxCostError: GraphQLMaxCostExceededError,
    variables: VariablesT
  ): VariablesT {
    if (!('limit' in variables)) {
      throw new InvalidValueError('variables (has no limit) when trying to adjustLimitInVariables', variables);
    }
    const { maxCost, cost } = maxCostError;
    const diminishingFactor = 0.75;
    const reducedLimit = Math.min(
      GRAPHQL_NODES_LIMIT,
      Math.max(1, Math.floor((maxCost / cost) * variables.limit * diminishingFactor))
    );

    return {
      ...variables,
      limit: reducedLimit,
    };
  }

  private async handleRetryForThrottledError<NodeT extends TadaDocumentNode>(
    throttledError: GraphQLThrottledError,
    response: GraphQlCodaFetchResponse<NodeT>,
    params: GraphQlRequestParams<NodeT>
  ): Promise<GraphQlRequestReturn<NodeT>> {
    const isCachedResponse = isCodaCached(response);
    // const isSyncContext = !!this.context.sync; // pas fiable

    /* Repay cost for non cached responses */
    if (!isCachedResponse) {
      await GraphQlClient.repayCost(throttledError.cost, true);
    }

    /**
     * We are doing a normal request. Retry immediately
     *
     * We could also signal the end of the sync if we are in a SyncContext, but detecting this is unreliable from my tests.
     */
    this.retries++;
    return this.request(params);
  }

  private async handleRetryForMaxCostExceededError<NodeT extends TadaDocumentNode>(
    maxCosterror: GraphQLMaxCostExceededError,
    params: GraphQlRequestParams<NodeT>
  ): Promise<GraphQlRequestReturn<NodeT>> {
    const adjustedVariables = this.adjustLimitInVariables(maxCosterror, params.variables);
    console.log(
      `⛔️ ${maxCosterror.message} maxCost is ${maxCosterror.maxCost} while cost is ${maxCosterror.cost}. Adjusting next query to run with ${adjustedVariables.limit} max entries.`
    );
    this.retries++;
    return this.request({ ...params, variables: adjustedVariables });
  }

  public async request<NodeT extends TadaDocumentNode>(
    params: GraphQlRequestParams<NodeT>
  ): Promise<GraphQlRequestReturn<NodeT>> {
    const { context } = this;
    const { documentNode, variables, options } = params;
    let response: GraphQlCodaFetchResponse<NodeT>;

    try {
      if (this.retries > 0) {
        logAdmin(`🔄 Retrying (count: ${this.retries})...`);
        if (this.retries > GraphQlClient.MAX_RETRIES) {
          throw new coda.UserVisibleError(`Max retries (${GraphQlClient.MAX_RETRIES}) of GraphQL requests exceeded.`);
        }
      }

      response = await context.fetcher.fetch(this.getFetchRequest(documentNode, variables, options));
      // console.log('——————— isCodaCached', isCodaCached(response));

      this.throwOnErrors(response);

      // Always repay cost
      if (!isCodaCached(response) && response.body.extensions?.cost) {
        await GraphQlClient.repayCost(response.body.extensions.cost);
      }

      return {
        body: response.body,
        headers: response.headers,
        pageInfo: GraphQlClient.getPageInfo(response.body),
        cost: response.body.extensions.cost,
      };
    } catch (error) {
      if (error instanceof GraphQLThrottledError) {
        return this.handleRetryForThrottledError<NodeT>(error, response, params);
      }

      if (error instanceof GraphQLMaxCostExceededError && variables?.limit) {
        return this.handleRetryForMaxCostExceededError<NodeT>(error, params);
      }

      throw error;
    }
  }
}
