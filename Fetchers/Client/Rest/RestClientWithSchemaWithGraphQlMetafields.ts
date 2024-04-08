import { idToGraphQlGid } from '../../../helpers-graphql';
import { CodaMetafieldKeyValueSet } from '../../../helpers-setup';
import { ResourceWithMetafields } from '../../../resources/Resource.types';
import { MetafieldGraphQlFetcher } from '../../../resources/metafields/MetafieldGraphQlFetcher';
import { SetMetafieldsGraphQlReturn } from '../../Fetcher.types';
import { RestClientWithMetafields } from './_RestClientWithMetafields';

export abstract class RestClientWithGraphQlMetafields<
  ResourceT extends ResourceWithMetafields<any, any>
> extends RestClientWithMetafields<ResourceT> {
  async setMetafields(
    rowId: number,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[]
  ): Promise<SetMetafieldsGraphQlReturn> {
    const ownerGid = idToGraphQlGid(this.resource.graphQl.name, rowId);
    const metafieldFetcher = new MetafieldGraphQlFetcher(this.resource, this.context);
    return metafieldFetcher.createUpdateDelete(ownerGid, metafieldKeyValueSets);
  }
}
