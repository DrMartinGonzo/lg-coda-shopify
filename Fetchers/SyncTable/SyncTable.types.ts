// #region Imports
import * as coda from '@codahq/packs-sdk';

import { BaseRow } from '../../schemas/CodaRows.types';
import { ShopifyGraphQlRequestCost } from '../NEW/GraphQLError';
import { SearchParams } from '../NEW/RestClientNEW';
import { Stringified } from '../fetcher-helpers';

// #endregion

/** Helper type to extract the parameter values from a SyncTableDef. */
export type SyncTableParamValues<
  T extends
    | coda.SyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>
    | coda.DynamicSyncTableDef<string, string, coda.ParamDefs, coda.ObjectSchema<string, string>>
> = coda.ParamValues<T['getter']['parameters']>;

export interface SyncTableSyncResult {
  result: Array<any>;
  continuation?: any;
}

export interface SyncTableUpdateResult {
  result: Array<any>;
}

export interface SyncTableRestContinuation extends coda.Continuation {
  nextUrl?: string;
  nextQuery?: Stringified<SearchParams>;
  scheduledNextRestUrl?: string;
  skipNextRestSync: string;
  extraContinuationData: {
    [key: string]: any;
  };
}

export type CurrentBatchType<CodaRowT extends BaseRow = BaseRow> = {
  processing: CodaRowT[];
  remaining: CodaRowT[];
};

export interface SyncTableMixedContinuation<CodaRowT extends BaseRow = any> extends SyncTableRestContinuation {
  cursor?: string;
  retries: number;
  graphQlLock: string;

  lastCost?: Stringified<ShopifyGraphQlRequestCost>;
  lastMaxEntriesPerRun?: number;
  reducedMaxEntriesPerRun?: number;

  // TODO: currentBatch on le met pas dans extraContinuationData
  extraContinuationData: {
    currentBatch: CurrentBatchType<CodaRowT>;
    [key: string]: any;
  };
}

type SyncTableGraphQlExtraContinuationData = {
  [key: string]: any;
};
export interface SyncTableGraphQlContinuation extends coda.Continuation {
  cursor?: string;
  retries: number;
  graphQlLock: string;

  lastCost?: Stringified<ShopifyGraphQlRequestCost>;
  lastMaxEntriesPerRun?: number;
  reducedMaxEntriesPerRun?: number;

  extraContinuationData: SyncTableGraphQlExtraContinuationData;
}

// export interface SyncTableGraphQlContinuation extends coda.Continuation {
//   cursor?: string;
//   retries: number;
//   extraContinuationData: any;
//   graphQlLock: string;

//   lastMaxEntriesPerRun?: number;
//   reducedMaxEntriesPerRun?: number;
//   lastCost?: Omit<ShopifyGraphQlRequestCost, 'throttleStatus'>;
//   lastThrottleStatus?: ShopifyGraphQlThrottleStatus;
// }

// export interface SyncTableRestContinuation extends coda.Continuation {
//   nextUrl?: string;
//   extraContinuationData: any;
// }

// export interface SyncTableRestAugmentedContinuation extends SyncTableRestContinuation, SyncTableGraphQlContinuation {
//   graphQlPayload?: any;
//   remainingRestItems?: any;
//   prevRestNextUrl?: string;
//   nextRestUrl?: string;
//   scheduledNextRestUrl?: string;
// }
// export interface SyncTableMixedContinuation extends SyncTableRestContinuation, SyncTableGraphQlContinuation {
//   scheduledNextRestUrl?: string;
//   // @ts-ignore
//   extraContinuationData: {
//     skipNextRestSync: boolean;
//     metafieldDefinitions: MetafieldDefinition[];
//     /** Utilisé pour déterminer le type de ressource à récupérer, à la prochaine
//      * requête Rest. Par ex. pour les collections. */
//     restType?: string;
//     currentBatch: {
//       remaining: any[];
//       processing: any[];
//     };
//   };
// }
