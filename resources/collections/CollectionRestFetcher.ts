import * as coda from '@codahq/packs-sdk';
import { CollectionRestFetcherBase } from './CollectionRestFetcherBase';
import { collectionResource } from './collectionResource';

export class CollectionRestFetcher extends CollectionRestFetcherBase<typeof collectionResource> {
  constructor(context: coda.ExecutionContext) {
    super(collectionResource, context);
  }
}
