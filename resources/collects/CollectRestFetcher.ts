import * as coda from '@codahq/packs-sdk';
import { SimpleRest } from '../../Fetchers/SimpleRest';
import { OPTIONS_PUBLISHED_STATUS } from '../../constants';
import { formatCollectionReference } from '../../schemas/syncTable/CollectionSchema';
import { formatProductReference } from '../../schemas/syncTable/ProductSchemaRest';
import { CollectRow } from '../../schemas/CodaRows.types';
import { Collect, collectResource } from './collectResource';

export class CollectRestFetcher extends SimpleRest<Collect> {
  constructor(context: coda.ExecutionContext) {
    super(collectResource, context);
  }

  validateParams = (params: any) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if (params.published_status && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published_status: ' + params.published_status);
    }
    return true;
  };

  formatApiToRow = (collect): CollectRow => {
    let obj: CollectRow = {
      ...collect,
    };
    if (collect.product_id) {
      obj.product = formatProductReference(collect.product_id);
    }
    if (collect.collection_id) {
      obj.collection = formatCollectionReference(collect.collection_id);
    }

    return obj;
  };
}
