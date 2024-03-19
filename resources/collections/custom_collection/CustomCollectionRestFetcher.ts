import * as coda from '@codahq/packs-sdk';
import { CollectionRestFetcherBase } from '../CollectionRestFetcherBase';
import { customCollectionResource } from './customCollectionResource';

export class CustomCollectionRestFetcher extends CollectionRestFetcherBase<typeof customCollectionResource> {
  constructor(context: coda.ExecutionContext) {
    super(customCollectionResource, context);
  }
}
