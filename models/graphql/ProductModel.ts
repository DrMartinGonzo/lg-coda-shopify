// #region Imports
import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';
import { ResultOf } from '../../utils/tada-utils';

import { ProductClient } from '../../Clients/GraphQlApiClientBase';
import { GraphQlResourceNames, RestResourcesSingular } from '../types/SupportedResource';
import { DEFAULT_PRODUCTVARIANT_OPTION_VALUE } from '../../config';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { productFieldsFragment } from '../../graphql/products-graphql';
import { ProductRow } from '../../schemas/CodaRows.types';
import { MetafieldOwnerType } from '../../types/admin.types';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { safeToString, splitAndTrimValues } from '../../utils/helpers';
import { SupportedMetafieldOwnerResource } from '../rest/MetafieldModel';
import {
  AbstractModelGraphQlWithMetafields,
  BaseModelDataGraphQlWithMetafields,
  GraphQlApiDataWithMetafields,
} from './AbstractModelGraphQlWithMetafields';

// #endregion

// #region Types
export interface ProductApidata
  extends GraphQlApiDataWithMetafields,
    Omit<ResultOf<typeof productFieldsFragment>, 'metafields'> {}

export interface ProductModelData extends Omit<ProductApidata, 'metafields'>, BaseModelDataGraphQlWithMetafields {}
// #endregion

export class ProductModel extends AbstractModelGraphQlWithMetafields {
  public data: ProductModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.Product;
  protected static readonly graphQlName = GraphQlResourceNames.Product;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.Product;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Product;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: ProductRow) {
    let data: Partial<ProductModelData> = {
      id: idToGraphQlGid(GraphQlResourceNames.Product, row.id),
      descriptionHtml: row.body_html,
      createdAt: safeToString(row.created_at),
      publishedAt: safeToString(row.published_at),
      templateSuffix: row.template_suffix,
      updatedAt: safeToString(row.updated_at),
      handle: row.handle,
      title: row.title,
      productType: row.product_type,
      isGiftCard: row.giftCard,
      options: row.options
        ? splitAndTrimValues(row.options).map((name) => ({
            name,
            values: [
              {
                // We need to add a default variant to the product if some options are defined
                name: DEFAULT_PRODUCTVARIANT_OPTION_VALUE,
              },
            ],
          }))
        : undefined,
      onlineStoreUrl: row.storeUrl,
      status: row.status as any,
      tags: row.tags ? splitAndTrimValues(row.tags) : undefined,
      vendor: row.vendor,
      featuredImage: row.featuredImage ? { url: row.featuredImage } : undefined,
      images: row.images
        ? {
            nodes: row.images.map((url) => ({ url })),
          }
        : undefined,
    };

    return ProductModel.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return ProductClient.createInstance(this.context);
  }

  public toCodaRow(): ProductRow {
    const { metafields, ...data } = this.data;

    let obj: ProductRow = {
      id: this.restId,
      title: data.title,
      admin_url: `${this.context.endpoint}/admin/products/${this.restId}`,
      body: striptags(data.descriptionHtml),
      body_html: data.descriptionHtml,
      published: !!data.onlineStoreUrl,
      status: data.status,
      admin_graphql_api_id: this.graphQlGid,
      created_at: data.createdAt,
      published_at: data.publishedAt,
      updated_at: data.updatedAt,
      handle: data.handle,
      product_type: data.productType,
      tags: data.tags ? data.tags.join(', ') : undefined,
      template_suffix: data.templateSuffix,
      vendor: data.vendor,
      storeUrl: data.onlineStoreUrl,
      featuredImage: data.featuredImage ? data.featuredImage.url : undefined,
      giftCard: data.isGiftCard,
    };

    if (data.options && Array.isArray(data.options)) {
      obj.options = data.options.map((option) => option.name).join(',');
    }
    if (data.images?.nodes && Array.isArray(data.images.nodes)) {
      obj.images = data.images.nodes.map((image) => image.url);
    }

    if (metafields) {
      metafields.forEach((metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj as ProductRow;
  }
}
