import * as coda from '@codahq/packs-sdk';
import { CollectionRestFetcherBase } from '../CollectionRestFetcherBase';
import { CustomCollection, customCollectionResource } from './customCollectionResource';

export class CustomCollectionRestFetcher extends CollectionRestFetcherBase<CustomCollection> {
  constructor(context: coda.ExecutionContext) {
    super(customCollectionResource, context);
  }
}
