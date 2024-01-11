import * as coda from '@codahq/packs-sdk';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from './Shopify';

export interface SyncTableStorefrontContinuation extends coda.Continuation {
  cursor: string;
  lastSyncTime: number;
  retryCount: number;
  extraContinuationData: any;
}

export interface SyncTableGraphQlContinuation extends SyncTableStorefrontContinuation {
  // cursor: string;
  // lastSyncTime: number;
  // retryCount: number;
  // extraContinuationData: any;
  lastMaxEntriesPerRun: number;
  reducedMaxEntriesPerRun?: number;
  lastCost: Omit<ShopifyGraphQlRequestCost, 'throttleStatus'>;
  lastThrottleStatus: ShopifyGraphQlThrottleStatus;
}

export interface SyncTableRestContinuation extends coda.Continuation {
  nextUrl: string;
  extraContinuationData: any;
}
