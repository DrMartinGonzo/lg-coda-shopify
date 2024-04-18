// #region Imports
import * as coda from '@codahq/packs-sdk';

import { BaseRow } from '../../schemas/CodaRows.types';
import { ShopifyGraphQlRequestCost } from '../../Errors/GraphQlErrors';
import { SearchParams } from '../../Clients/RestClient';
import { Stringified } from '../../types/utilities';

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
  extraData: {
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

  // TODO: currentBatch on le met pas dans extraData
  extraData: {
    currentBatch?: CurrentBatchType<CodaRowT>;
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

  extraData: SyncTableGraphQlExtraContinuationData;
}
