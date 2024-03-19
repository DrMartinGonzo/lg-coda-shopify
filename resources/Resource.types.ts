import * as coda from '@codahq/packs-sdk';

import type { GraphQlResourceName } from '../Fetchers/ShopifyGraphQlResource.types';
import type { RestResourcePlural, RestResourceSingular } from '../Fetchers/ShopifyRestResource.types';
import { BaseRow } from '../schemas/CodaRows.types';
import type { MetafieldOwnerType } from '../types/admin.types';

// #region Resource Parameters
export interface ResourceSyncRestParams {
  limit?: number;
}
export interface ResourceCreateRestParams {}
export interface ResourceUpdateRestParams {}
// #endregion

// #region Resource Definition
type WithMetafields<SupportDefT extends boolean> = {
  metafields: {
    ownerType: MetafieldOwnerType;
    useGraphQl: boolean;
    hasSyncTable: boolean;
    // TODO: better type
    // @see line 149 in metafields-coda
    supportsDefinitions: SupportDefT;
  };
};

type ResourceParams = {
  codaRow: BaseRow;
  schema: coda.ObjectSchema<string, string>;
  rest: {
    singular: RestResourceSingular;
    plural: RestResourcePlural;
  };
  params: {
    /** Parameters used for the sync endpoint */
    sync?: {
      [key: string]: any;
    };
    /** Parameters used for the create endpoint */
    create?: {
      [key: string]: any;
    };
    /** Parameters used for the update endpoint */
    update?: {
      [key: string]: any;
    };
    /** Other parameters */
    [key: string]: {
      [key: string]: any;
    };
  };
};
export type Resource<ParamsT extends ResourceParams> = {
  /** user friendly name */
  display: string;
  codaRow: ParamsT['codaRow'];
  /** Coda schema */
  schema: ParamsT['schema'];
  graphQl: {
    /** GraphQl resource name */
    name: GraphQlResourceName;
    /** GraphQl singular name used for queries */
    singular?: string;
    /** GraphQl plural name used for queries */
    plural?: string;
  };
  rest: {
    /** Rest singular name */
    singular: ParamsT['rest']['singular'];
    /** Rest plural name */
    plural: ParamsT['rest']['plural'];
    singleFetchResponse: Record<ParamsT['rest']['singular'], ParamsT['codaRow']>;
    multipleFetchResponse: Record<ParamsT['rest']['plural'], Array<ParamsT['codaRow']>>;
    params: {
      [key in keyof ParamsT['params']]: ParamsT['params'][key];
    };
  };
};

export type ResourceWithMetafields<
  ParamsT extends ResourceParams & {
    metafields: {
      ownerType: MetafieldOwnerType;
    };
  }
> = Resource<ParamsT> & WithMetafields<false>;

export type ResourceWithMetafieldDefinitionsNew<
  ParamsT extends ResourceParams & {
    metafields: {
      ownerType: MetafieldOwnerType;
    };
  }
> = Resource<ParamsT> & WithMetafields<true>;

export type ResourceUnion = Resource<any> | ResourceWithMetafields<any>;
// #endregion
