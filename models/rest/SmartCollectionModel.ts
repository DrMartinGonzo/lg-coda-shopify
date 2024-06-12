// #region Imports
import * as coda from '@codahq/packs-sdk';

import { OrderSmartCollectionArgs, SmartCollectionClient } from '../../Clients/RestApiClientBase';
import { GraphQlResourceNames, RestResourcesSingular } from '../../Resources/types/SupportedResource';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { CollectionRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { CollectionModelData, collectionModelToCodaRow } from '../../utils/collections-utils';
import { safeToString } from '../../utils/helpers';
import { BaseApiDataRest } from './AbstractModelRest';
import {
  AbstractModelRestWithGraphQlMetafields,
  BaseModelDataRestWithGraphQlMetafields,
} from './AbstractModelRestWithMetafields';
import { SupportedMetafieldOwnerResource } from './MetafieldModel';

// #endregion

// #region Types
interface SmartCollectionRule {
  column: string;
  condition: string;
  relation: string;
}

export interface SmartCollectionApiData extends BaseApiDataRest {
  rules: Array<SmartCollectionRule> | null;
  title: string | null;
  body_html: string | null;
  disjunctive: boolean | null;
  handle: string | null;
  id: number | null;
  image: {
    src?: string;
    alt?: string;
  } | null;
  published_at: string | null;
  published_scope: string | null;
  sort_order: string | null;
  template_suffix: string | null;
  updated_at: string | null;
}

export interface SmartCollectionModelData extends SmartCollectionApiData, BaseModelDataRestWithGraphQlMetafields {}
// #endregion

export class SmartCollectionModel extends AbstractModelRestWithGraphQlMetafields<SmartCollectionModel> {
  public data: SmartCollectionModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Collection;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Collection;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Collection;
  protected static readonly graphQlName = GraphQlResourceNames.Collection;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: CollectionRow) {
    const data: Partial<SmartCollectionModelData> = {
      body_html: row.body_html,
      disjunctive: row.disjunctive,
      handle: row.handle,
      id: row.id,
      image: {
        src: row.image_url,
        alt: row.image_alt_text,
      },
      published_at: safeToString(row.published_at),
      published_scope: row.published_scope,
      rules: row.rules as SmartCollectionRule[],
      sort_order: row.sort_order,
      template_suffix: row.template_suffix,
      title: row.title,
      updated_at: safeToString(row.updated_at),
    };
    return this.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return SmartCollectionClient.createInstance(this.context);
  }

  public async order({ products, sort_order }: Omit<OrderSmartCollectionArgs, 'id'>) {
    const response = await this.client.order({ id: this.data.id, products, sort_order });
    if (response) this.setData(response.body);
  }

  public toCodaRow(): CollectionRow {
    return collectionModelToCodaRow(this.context, this.data as CollectionModelData);
  }
}
