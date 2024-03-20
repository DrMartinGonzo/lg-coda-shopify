import * as coda from '@codahq/packs-sdk';
import { CollectionRestFetcherBase } from './CollectionRestFetcherBase';
import { Collection, collectionResource } from './collectionResource';

export class CollectionRestFetcher extends CollectionRestFetcherBase<Collection> {
  constructor(context: coda.ExecutionContext) {
    super(collectionResource, context);
  }
}
