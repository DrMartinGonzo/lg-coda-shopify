import * as coda from '@codahq/packs-sdk';
import { ShopifyGraphQlRequestCost, ShopifyGraphQlThrottleStatus } from './Shopify';

export interface SyncTableGraphQlContinuation extends coda.Continuation {
  lastMaxEntriesPerRun: number;
  reducedMaxEntriesPerRun?: number;
  cursor: string;
  lastSyncTime: number;
  retryCount: number;
  lastCost: Omit<ShopifyGraphQlRequestCost, 'throttleStatus'>;
  lastThrottleStatus: ShopifyGraphQlThrottleStatus;
  extraContinuationData: any;
}
