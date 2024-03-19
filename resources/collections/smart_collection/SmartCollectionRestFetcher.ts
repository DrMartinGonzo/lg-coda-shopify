import * as coda from '@codahq/packs-sdk';
import { SmartCollection, smartCollectionResource } from './smartCollectionResource';
import { CollectionRestFetcherBase } from '../CollectionRestFetcherBase';

export class SmartCollectionRestFetcher extends CollectionRestFetcherBase<SmartCollection> {
  constructor(context: coda.ExecutionContext) {
    super(smartCollectionResource, context);
  }
}
