import { ResultOf } from '../../../utils/graphql';

import { CodaMetafieldKeyValueSet } from '../../../helpers-setup';
import { ResourceWithMetafields } from '../../../resources/Resource.types';
import { DeletedMetafieldsByKeys } from '../../../resources/metafields/Metafield.types';
import { metafieldFieldsFragmentWithDefinition } from '../../../resources/metafields/metafields-graphql';
import { shouldUpdateSyncTableMetafieldValue } from '../../../resources/metafields/utils/metafields-utils';
import {
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
} from '../../../resources/metafields/utils/metafields-utils-keys';
import { formatMetaFieldValueForSchema } from '../../../resources/metafields/utils/metafields-utils-formatToRow';
import { FetchRequestOptions, SetMetafieldsGraphQlReturn, SetMetafieldsRestReturn } from '../../Fetcher.types';
import { RestResources } from '../../../resources/ShopifyResource.types';
import { RestClientWithSchema } from './RestClientWithSchema';

export abstract class RestClientWithMetafields<
  ResourceT extends ResourceWithMetafields<any, any>
> extends RestClientWithSchema<ResourceT> {
  abstract setMetafields(
    rowId: number,
    metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet>
  ): Promise<SetMetafieldsRestReturn | SetMetafieldsGraphQlReturn>;

  protected formatMetafieldsSetResult(
    metafields: {
      deleted: Array<DeletedMetafieldsByKeys>;
      updated: Array<RestResources['Metafield']> | Array<ResultOf<typeof metafieldFieldsFragmentWithDefinition>>;
    },
    /** Wether the data will be consumed by an action wich result use a `coda.withIdentity` schema. */
    schemaWithIdentity?: boolean
  ): { [key: string]: any } {
    const { deleted = [], updated = [] } = metafields;
    let obj = {};

    if (deleted.length) {
      deleted.forEach((m) => {
        const prefixedKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(m));
        obj[prefixedKey] = undefined;
      });
    }
    if (updated.length) {
      updated.forEach((metafield) => {
        console.log(
          'shouldUpdateSyncTableMetafieldValue(metafield.type, schemaWithIdentity)',
          shouldUpdateSyncTableMetafieldValue(metafield.type, schemaWithIdentity)
        );
        if (shouldUpdateSyncTableMetafieldValue(metafield.type, schemaWithIdentity)) {
          const prefixedKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
          obj[prefixedKey] = formatMetaFieldValueForSchema(metafield);
        }
      });
    }

    return obj;
  }

  public async updateAndFormatToRow(
    params: {
      id: number;
      restUpdate: ResourceT['rest']['params']['update'];
      metafieldSets: Array<CodaMetafieldKeyValueSet>;
    },
    requestOptions: FetchRequestOptions = {}
  ): Promise<ResourceT['codaRow']> {
    const { id, restUpdate = {}, metafieldSets = [] } = params;

    const formattedRowPromise = super.updateAndFormatToRow({ id, restUpdate }, requestOptions);
    const setMetafieldsPromise = this.setMetafields(id, metafieldSets);

    const [formattedRow, { deletedMetafields, updatedMetafields }] = await Promise.all([
      formattedRowPromise,
      setMetafieldsPromise,
    ]);

    const formattedMetafields = this.formatMetafieldsSetResult({
      deleted: deletedMetafields,
      updated: updatedMetafields,
    });

    return {
      ...formattedRow,
      ...formattedMetafields,
    };
  }
}
