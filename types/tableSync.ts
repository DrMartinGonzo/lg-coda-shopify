import * as coda from '@codahq/packs-sdk';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from './ShopifyGraphQlErrors';
import { MetafieldDefinition } from './admin.types';

export interface SyncTableRestContinuation extends coda.Continuation {
  nextUrl: string;
  extraContinuationData: any;
}

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

export interface SyncTableRestAugmentedContinuation extends SyncTableRestContinuation, SyncTableGraphQlContinuation {
  graphQlPayload?: any;
  remainingRestItems?: any;
  prevRestNextUrl?: string;
  nextRestUrl?: string;
  scheduledNextRestUrl?: string;
}

export interface SyncTableMixedContinuation extends SyncTableRestContinuation, SyncTableGraphQlContinuation {
  scheduledNextRestUrl: string;
  // @ts-ignore
  extraContinuationData: {
    skipNextRestSync: boolean;
    metafieldDefinitions: MetafieldDefinition[];
    currentBatch: {
      remaining: any[];
      processing: any[];
    };
  };
}
