// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../../utils/tada-utils';

import { VariantClient } from '../../Clients/GraphQlApiClientBase';
import { GraphQlResourceNames, RestResourcesSingular } from '../../Resources/types/SupportedResource';
import { Identity, PACK_IDENTITIES } from '../../constants';
import { productVariantFieldsFragment } from '../../graphql/productVariants-graphql';
import { ProductVariantRow } from '../../schemas/CodaRows.types';
import { formatProductReference } from '../../schemas/syncTable/ProductSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { graphQlGidToId, idToGraphQlGid } from '../../utils/conversion-utils';
import { getUnitMap, unitToShortName, weightUnitsMap } from '../../utils/helpers';
import { SupportedMetafieldOwnerResource } from '../rest/MetafieldModel';
import {
  AbstractModelGraphQlWithMetafields,
  BaseModelDataGraphQlWithMetafields,
  GraphQlApiDataWithMetafields,
} from './AbstractModelGraphQlWithMetafields';

// #endregion

// #region Types
export interface VariantApidata
  extends GraphQlApiDataWithMetafields,
    Omit<ResultOf<typeof productVariantFieldsFragment>, 'metafields'> {}

export interface VariantModelData extends Omit<VariantApidata, 'metafields'>, BaseModelDataGraphQlWithMetafields {}
// #endregion

export const VARIANT_OPTION_KEYS = ['option1', 'option2', 'option3'];
export const VARIANT_WEIGHT_KEYS = ['grams', 'weight', 'weight_unit'];

export class VariantModel extends AbstractModelGraphQlWithMetafields<VariantModel> {
  public data: VariantModelData;

  public static readonly displayName: Identity = PACK_IDENTITIES.ProductVariant;
  protected static readonly graphQlName = GraphQlResourceNames.ProductVariant;
  public static readonly metafieldRestOwnerType: SupportedMetafieldOwnerResource = RestResourcesSingular.ProductVariant;
  public static readonly metafieldGraphQlOwnerType = MetafieldOwnerType.Productvariant;

  public static createInstanceFromRow(context: coda.ExecutionContext, row: ProductVariantRow) {
    let data: Partial<VariantModelData> = {
      id: idToGraphQlGid(GraphQlResourceNames.ProductVariant, row.id),
      barcode: row.barcode,
      compareAtPrice: row.compare_at_price,
      createdAt: row.created_at ? row.created_at.toString() : undefined,
      displayName: row.displayTitle,
      inventoryPolicy: row.inventory_policy as any,
      inventoryQuantity: row.inventory_quantity,
      position: row.position,
      price: row.price,
      product: row.product?.id
        ? {
            onlineStoreUrl: row.storeUrl ? row.storeUrl.split('?')[0] : undefined,
            id: idToGraphQlGid(GraphQlResourceNames.Product, row.product?.id),
          }
        : undefined,
      sku: row.sku,
      taxCode: row.tax_code,
      taxable: row.taxable,
      title: row.title,
      updatedAt: row.updated_at ? row.updated_at.toString() : undefined,
      image: row.image
        ? {
            url: row.image,
          }
        : undefined,
    };

    /**
     * For options, the previous value must always be present.
     * We can only update options for a variant with two or three options if two
     * or three option values are present. So we set the option values until the
     * last defined value and if an update is needed, the
     * {@link AbstractResource.addMissingData} method will fill in the rest
     */
    const options = [row.option1, row.option2, row.option3];
    const lastOptionValueIndex = options.map((option) => !!option).lastIndexOf(true) as number;
    if (lastOptionValueIndex !== -1) {
      for (let i = 0; i < options.length; i++) {
        data.selectedOptions = data.selectedOptions || [];
        data.selectedOptions.push({ value: options[i] });
        if (i === lastOptionValueIndex) break;
      }
    }

    if (row.inventory_item_id || row.weight || row.weight_unit) {
      (data.inventoryItem as Partial<typeof data.inventoryItem>) = {};
      if (row.inventory_item_id) {
        data.inventoryItem.id = idToGraphQlGid(GraphQlResourceNames.InventoryItem, row.inventory_item_id);
      }
      if (row.weight || row.weight_unit) {
        (data.inventoryItem.measurement as Partial<typeof data.inventoryItem.measurement>) = {};
        (data.inventoryItem.measurement.weight as Partial<typeof data.inventoryItem.measurement.weight>) = {
          value: row.weight,
        };
        /** Only add weight_unit if it's not undefined.
         * If needed by an update, {@link AbstractResource.addMissingData} will fill in the rest */
        if (row.weight_unit) {
          data.inventoryItem.measurement.weight.unit = Object.entries(getUnitMap('weight')).find(([key, value]) => {
            return value === row.weight_unit;
          })[0] as any;
        }
      }
    }

    return VariantModel.createInstance(context, data);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get client() {
    return VariantClient.createInstance(this.context);
  }

  public toCodaRow(): ProductVariantRow {
    const { metafields, ...data } = this.data;

    const productId = graphQlGidToId(data.product?.id);
    const inventoryItemId = graphQlGidToId(data.inventoryItem?.id);

    let obj: ProductVariantRow = {
      admin_graphql_api_id: this.graphQlGid,
      barcode: data.barcode,
      compare_at_price: data.compareAtPrice ? parseFloat(data.compareAtPrice) : undefined,
      created_at: data.createdAt,
      displayTitle: data.displayName,
      id: this.restId,
      image: data.image?.url,
      inventory_policy: data.inventoryPolicy,
      inventory_quantity: data.inventoryQuantity,
      position: data.position,
      price: data.price ? parseFloat(data.price) : undefined,
      sku: data.sku,
      tax_code: data.taxCode,
      taxable: data.taxable,
      title: data.title,
      updated_at: data.updatedAt,
    };

    if (data.selectedOptions) {
      obj.option1 = data.selectedOptions[0]?.value ?? null;
      obj.option2 = data.selectedOptions[1]?.value ?? null;
      obj.option3 = data.selectedOptions[2]?.value ?? null;
    }

    if (inventoryItemId) {
      obj.inventory_item_id = inventoryItemId;
    }
    if (data.inventoryItem?.measurement?.weight) {
      obj.weight = data.inventoryItem.measurement.weight?.value;
      obj.weight_unit = unitToShortName(data.inventoryItem.measurement.weight?.unit);
      switch (obj.weight_unit) {
        case weightUnitsMap.GRAMS:
          obj.grams = obj.weight;
          break;
        case weightUnitsMap.KILOGRAMS:
          obj.grams = obj.weight * 1000;
          break;
        case weightUnitsMap.OUNCES:
          obj.grams = obj.weight * 28.34952;
          break;
        case weightUnitsMap.POUNDS:
          obj.grams = obj.weight * 453.59237;
          break;
      }
    }

    if (productId) {
      obj.admin_url = `${this.context.endpoint}/admin/products/${productId}/variants/${this.restId}`;
      obj.product_id = productId;
      obj.product = formatProductReference(productId);
    }

    if (data.product?.onlineStoreUrl) {
      obj.storeUrl = `${data.product.onlineStoreUrl}?variant=${this.restId}`;
    }

    if (metafields) {
      metafields.forEach((metafield) => {
        obj[metafield.prefixedFullKey] = metafield.formatValueForOwnerRow();
      });
    }

    return obj as ProductVariantRow;
  }
}
