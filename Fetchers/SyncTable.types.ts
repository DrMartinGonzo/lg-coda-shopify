// #region Imports
import * as coda from '@codahq/packs-sdk';

import type { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from './Fetcher.types';

// #endregion

export interface SyncTableGraphQlContinuation extends coda.Continuation {
  cursor?: string;
  retries: number;
  extraContinuationData: any;
  graphQlLock: string;

  lastMaxEntriesPerRun?: number;
  reducedMaxEntriesPerRun?: number;
  lastCost?: Omit<ShopifyGraphQlRequestCost, 'throttleStatus'>;
  lastThrottleStatus?: ShopifyGraphQlThrottleStatus;
}

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