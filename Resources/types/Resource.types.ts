// #region Imports
import * as coda from '@codahq/packs-sdk';

import { Body } from '@shopify/shopify-api/rest/types';
import { FetchRequestOptions } from '../../Clients/Client.types';
import { BaseRow } from '../../schemas/CodaRows.types';
import { Metafield } from '../Rest/Metafield';

// #endregion

export interface FromRow<RowT extends BaseRow = BaseRow> {
  row: Partial<RowT> | null;
  metafields?: Array<Metafield>;
}

export interface ResourceConstructorArgs {
  context: coda.ExecutionContext;
  fromData?: Body | null;
  fromRow?: FromRow;
}

export interface BaseContext {
  context: coda.ExecutionContext;
  options?: FetchRequestOptions;
}
