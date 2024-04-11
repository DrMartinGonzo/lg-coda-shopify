// #region Imports
import * as coda from '@codahq/packs-sdk';

import { ResourceWithSchemaUnion } from '../../../resources/Resource.types';
import { GraphQlClient } from './GraphQlClient';
import { IClientWithSchema } from '../../Fetcher.types';
import { CodaMetafieldKeyValueSet } from '../../../helpers-setup';

// #endregion

// #region type
interface graphQlFetchParams {
  gid: string;
}
// #endregion

export abstract class GraphQlClientWithSchema<ResourceT extends ResourceWithSchemaUnion>
  extends GraphQlClient<ResourceT>
  implements IClientWithSchema
{
  readonly schema: ResourceT['schema'];

  constructor(resource: ResourceT, context: coda.ExecutionContext) {
    super(resource, context);
    this.schema = resource.schema;
  }

  abstract formatRowToApi(...args: any[]): any;

  abstract formatApiToRow(data: any): ResourceT['codaRow'];
}
