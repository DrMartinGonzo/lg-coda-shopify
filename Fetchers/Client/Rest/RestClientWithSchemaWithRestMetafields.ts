import { CodaMetafieldKeyValueSet } from '../../../helpers-setup';
import { ResourceWithMetafields } from '../../../resources/Resource.types';
import { MetafieldRestFetcher } from '../../../resources/metafields/MetafieldRestFetcher';
import { SetMetafieldsRestReturn } from '../../Fetcher.types';
import { RestClientWithMetafields } from './_RestClientWithMetafields';

export abstract class RestClientWithRestMetafields<
  ResourceT extends ResourceWithMetafields<any, any>
> extends RestClientWithMetafields<ResourceT> {
  async setMetafields(
    rowId: number,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[]
  ): Promise<SetMetafieldsRestReturn> {
    const metafieldFetcher = new MetafieldRestFetcher(this.resource, rowId, this.context);
    return metafieldFetcher.createUpdateDelete(metafieldKeyValueSets);
  }
}
