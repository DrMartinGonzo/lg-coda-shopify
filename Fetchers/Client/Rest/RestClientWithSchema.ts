import * as coda from '@codahq/packs-sdk';

import { ResourceWithSchemaUnion } from '../../../resources/Resource.types';
import { FetchRequestOptions, IClientWithSchema } from '../../Fetcher.types';
import { RestClient } from './RestClient';

export abstract class RestClientWithSchema<ResourceT extends ResourceWithSchemaUnion>
  extends RestClient<ResourceT>
  implements IClientWithSchema
{
  readonly schema: ResourceT['schema'];

  constructor(resource: ResourceT, context: coda.ExecutionContext, isSingleFetch = false) {
    super(resource, context, isSingleFetch);
    this.schema = resource.schema;
  }

  abstract formatRowToApi(...args: any[]): any;

  abstract formatApiToRow(data: any): ResourceT['codaRow'];

  // TODO: merge with validateparams
  validateUpdateJob(update: coda.SyncUpdate<any, any, ResourceT['schema']>) {
    return true;
  }

  public async updateAndFormatToRow(
    params: {
      id: number;
      restUpdate: ResourceT['rest']['params']['update'];
    },
    requestOptions: FetchRequestOptions = {}
  ): Promise<ResourceT['codaRow']> {
    const { id, restUpdate = {} } = params;

    const updateResponse = await this.update(id, restUpdate, requestOptions);
    const formattedRow = updateResponse?.body[this.singular]
      ? this.formatApiToRow(updateResponse.body[this.singular])
      : {};

    return formattedRow;
  }
}
