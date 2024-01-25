import * as coda from '@codahq/packs-sdk';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from './ShopifyGraphQlErrors';

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

export interface SyncTableRestAugmentedContinuation extends SyncTableRestContinuation, SyncTableGraphQlContinuation {}
