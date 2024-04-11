import * as coda from '@codahq/packs-sdk';

import { TadaDocumentNode } from 'gql.tada';
import type { GraphQlResourceName } from './ShopifyResource.types';
import type { RestResourcePlural, RestResourceSingular, RestResources } from './ShopifyResource.types';
import { BaseRow } from '../schemas/CodaRows.types';
import type { MetafieldOwnerType } from '../types/admin.types';

// #region Resource Parameters
export interface ResourceSyncRestParams {
  limit?: number;
}

// #endregion

// #region Resource Definition
type HasMetafieldsDefinition = {
  metafields: {
    // TODO: better type
    // @see line 149 in metafields-coda
    supportsDefinitions: true;
  };
};

type ResourceParams = {
  display: string;
  schema: coda.ObjectSchema<string, string>;
  graphQl: {
    /** GraphQl resource name */
    name: GraphQlResourceName;
    /** GraphQl singular name used for queries */
    singular?: string;
    /** GraphQl plural name used for queries */
    plural?: string;
  };
  rest: {
    singular: RestResourceSingular;
    plural: RestResourcePlural;
  };
};
type ResourceParamsWithMetafields = ResourceParams & {
  metafields: {
    ownerType: MetafieldOwnerType;
    useGraphQl: boolean;
    hasSyncTable: boolean;
    supportsDefinitions: boolean;
  };
};
type ResourceExtraParams = {
  codaRow: BaseRow;
  rest: {
    params: {};
  };
};

export type Resource<ParamsT extends ResourceParams, ExtraParamsT extends ResourceExtraParams> = {
  /** user friendly name */
  display: ParamsT['display'];
  codaRow: ExtraParamsT['codaRow'];
  /** Coda schema */
  schema: ParamsT['schema'];
  // graphQl: ParamsT['graphQl'];

  graphQl: {
    /** GraphQl resource name */
    name: ParamsT['graphQl']['name'];
    /** GraphQl singular name used for queries */
    singular?: ParamsT['graphQl']['singular'];
    /** GraphQl plural name used for queries */
    plural?: ParamsT['graphQl']['plural'];
  };

  rest: ParamsT['rest'] & {
    /** Rest singular name */
    singular: ParamsT['rest']['singular'];
    /** Rest plural name */
    plural: ParamsT['rest']['plural'];
    // TODO: ça devrait pas être la Shopify Rest Resource plutot que codaRow ?
    singleFetchResponse: Record<ParamsT['rest']['singular'], ExtraParamsT['codaRow']>;
    multipleFetchResponse: Record<ParamsT['rest']['plural'], Array<ExtraParamsT['codaRow']>>;
    params: {
      [key in keyof ExtraParamsT['rest']['params']]: ExtraParamsT['rest']['params'][key];
    };
  };
};

export type ResourceWithMetafields<
  ParamsT extends ResourceParamsWithMetafields,
  ExtraParamsT extends ResourceExtraParams
> = Resource<ParamsT, ExtraParamsT> & {
  metafields: {
    ownerType: ParamsT['metafields']['ownerType'];
    useGraphQl: ParamsT['metafields']['useGraphQl'];
    hasSyncTable: ParamsT['metafields']['hasSyncTable'];
    supportsDefinitions: ParamsT['metafields']['supportsDefinitions'];
  };
};
export type ResourceWithMetafieldDefinitions<
  ParamsT extends ResourceParamsWithMetafields,
  ExtraParamsT extends ResourceExtraParams
> = ResourceWithMetafields<ParamsT, ExtraParamsT> & HasMetafieldsDefinition;

export type ResourceUnion = Resource<any, any> | ResourceWithMetafields<any, any>;
// #endregion
