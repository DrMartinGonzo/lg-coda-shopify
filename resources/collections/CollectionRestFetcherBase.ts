import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';
import { SimpleRest } from '../../Fetchers/SimpleRest';
import { OPTIONS_PUBLISHED_STATUS } from '../../constants';
import { isNullOrEmpty } from '../../utils/helpers';
import { CollectionSyncTableSchema } from '../../schemas/syncTable/CollectionSchema';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';

import type { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { Collection } from './collectionResource';
import { CustomCollection } from './custom_collection/customCollectionResource';
import { SmartCollection } from './smart_collection/smartCollectionResource';

export abstract class CollectionRestFetcherBase<
  T extends Collection | CustomCollection | SmartCollection
> extends SimpleRest<T> {
  validateParams = (
    params:
      | Collection['rest']['params']['sync']
      | Collection['rest']['params']['create']
      | Collection['rest']['params']['update']
  ) => {
    const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
    if ('published_status' in params && !validPublishedStatuses.includes(params.published_status)) {
      throw new coda.UserVisibleError('Unknown published status: ' + params.published_status);
    }
    return true;
  };

  validateUpdateJob(update: coda.SyncUpdate<any, any, typeof CollectionSyncTableSchema>) {
    if (
      !isNullOrEmpty(update.newValue.image_alt_text) &&
      (isNullOrEmpty(update.newValue.image_url) || isNullOrEmpty(update.previousValue.image_url))
    ) {
      throw new coda.UserVisibleError("Collection image url can't be empty if image_alt_text is set");
    }
    return true;
  }

  formatRowToApi = (
    row: Partial<Collection['codaRow']>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Collection['rest']['params']['update'] | Collection['rest']['params']['create'] | undefined => {
    let restParams: Collection['rest']['params']['update'] & Collection['rest']['params']['create'] = {};

    if (row.body_html !== undefined) restParams.body_html = row.body_html;
    if (row.handle !== undefined) restParams.handle = row.handle;
    if (row.published !== undefined) restParams.published = row.published;
    if (row.template_suffix !== undefined) restParams.template_suffix = row.template_suffix;
    if (row.title !== undefined) restParams.title = row.title;
    if (row.image_alt_text !== undefined || row.image_url !== undefined) {
      restParams.image = {};
      if (row.image_alt_text !== undefined) restParams.image.alt = row.image_alt_text;
      if (row.image_url !== undefined) restParams.image.src = row.image_url;
    }

    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restParams = { ...restParams, metafields: metafieldRestInputs } as Collection['rest']['params']['create'];
    }

    // Means we have nothing to update/create
    if (Object.keys(restParams).length === 0) return undefined;
    return restParams;
  };

  formatApiToRow = (collection) => {
    let obj: Collection['codaRow'] = {
      ...collection,
      admin_url: `${this.context.endpoint}/admin/collections/${collection.id}`,
      body: striptags(collection.body_html),
      published: !!collection.published_at,
      disjunctive: collection.disjunctive ?? false,
    };

    if (collection.image) {
      obj.image_alt_text = collection.image.alt;
      obj.image_url = collection.image.src;
    }

    return obj;
  };
}
