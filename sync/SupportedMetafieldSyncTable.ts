// #region Imports
import * as coda from '@codahq/packs-sdk';

import { UnsupportedValueError } from '../Errors/Errors';
import { SupportedMetafieldOwnerType } from '../models/graphql/MetafieldGraphQlModel';
import { RestResourcesSingular } from '../constants/resourceNames-constants';
import { ArticleReference, formatArticleReference } from '../schemas/syncTable/ArticleSchema';
import { BlogReference, formatBlogReference } from '../schemas/syncTable/BlogSchema';
import { CollectionReference, formatCollectionReference } from '../schemas/syncTable/CollectionSchema';
import { CustomerReference, formatCustomerReference } from '../schemas/syncTable/CustomerSchema';
import { DraftOrderReference, formatDraftOrderReference } from '../schemas/syncTable/DraftOrderSchema';
import { LocationReference, formatLocationReference } from '../schemas/syncTable/LocationSchema';
import { OrderReference, formatOrderReference } from '../schemas/syncTable/OrderSchema';
import { PageReference, formatPageReference } from '../schemas/syncTable/PageSchema';
import { ProductReference, formatProductReference } from '../schemas/syncTable/ProductSchema';
import { ProductVariantReference, formatProductVariantReference } from '../schemas/syncTable/ProductVariantSchema';
import { ShopReference, formatShopReference } from '../schemas/syncTable/ShopSchema';
import { MetafieldOwnerType } from '../types/admin.types';
import { FormatRowReferenceFn } from '../schemas/CodaRows.types';

// #endregion

// #region Types
type OwnerReference = coda.GenericObjectSchema & coda.ObjectSchemaProperty;
// #endregion

export class SupportedMetafieldSyncTable {
  public readonly display: string;
  public readonly singular: string;
  public readonly ownerReference?: OwnerReference | undefined;
  public readonly formatOwnerReference?: FormatRowReferenceFn<any, any> | undefined;
  public readonly ownerType: SupportedMetafieldOwnerType;
  public readonly supportDefinition: boolean;

  constructor(ownerType: SupportedMetafieldOwnerType) {
    // set default properties
    this.ownerType = ownerType;
    this.supportDefinition = true;

    // TODO: Article, Page and Blog should use GraphQL metafields once GraphQl API version 2024-07 is stable
    switch (ownerType) {
      case MetafieldOwnerType.Article:
        this.display = 'Article';
        this.singular = RestResourcesSingular.Article;
        this.ownerReference = ArticleReference;
        this.formatOwnerReference = formatArticleReference;
        break;

      case MetafieldOwnerType.Blog:
        this.display = 'Blog';
        this.singular = RestResourcesSingular.Blog;
        this.ownerReference = BlogReference;
        this.formatOwnerReference = formatBlogReference;
        break;

      case MetafieldOwnerType.Collection:
        this.display = 'Collection';
        this.singular = RestResourcesSingular.Collection;
        this.ownerReference = CollectionReference;
        this.formatOwnerReference = formatCollectionReference;
        break;

      case MetafieldOwnerType.Customer:
        this.display = 'Customer';
        this.singular = RestResourcesSingular.Customer;
        this.ownerReference = CustomerReference;
        this.formatOwnerReference = formatCustomerReference;
        break;

      case MetafieldOwnerType.Draftorder:
        this.display = 'Draft order';
        this.singular = RestResourcesSingular.DraftOrder;
        this.ownerReference = DraftOrderReference;
        this.formatOwnerReference = formatDraftOrderReference;
        break;

      case MetafieldOwnerType.Location:
        this.display = 'Location';
        this.singular = RestResourcesSingular.Location;
        this.ownerReference = LocationReference;
        this.formatOwnerReference = formatLocationReference;
        break;

      case MetafieldOwnerType.Order:
        this.display = 'Order';
        this.singular = RestResourcesSingular.Order;
        this.ownerReference = OrderReference;
        this.formatOwnerReference = formatOrderReference;
        break;

      case MetafieldOwnerType.Page:
        this.display = 'Page';
        this.singular = RestResourcesSingular.Page;
        this.ownerReference = PageReference;
        this.formatOwnerReference = formatPageReference;
        break;

      case MetafieldOwnerType.Product:
        this.display = 'Product';
        this.singular = RestResourcesSingular.Product;
        this.ownerReference = ProductReference;
        this.formatOwnerReference = formatProductReference;
        break;

      case MetafieldOwnerType.Productvariant:
        this.display = 'Product variant';
        this.singular = RestResourcesSingular.ProductVariant;
        this.ownerReference = ProductVariantReference;
        this.formatOwnerReference = formatProductVariantReference;
        break;

      case MetafieldOwnerType.Shop:
        this.display = 'Shop';
        this.singular = RestResourcesSingular.Shop;
        this.ownerReference = ShopReference;
        this.formatOwnerReference = formatShopReference;
        this.supportDefinition = false;
        break;

      default:
        throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
    }
  }

  getAdminUrl(context: coda.ExecutionContext): string {
    return `${context.endpoint}/admin${
      this.singular !== undefined ? `/settings/custom_data/${this.singular}/metafields` : ''
    }`;
  }
}

export function getSupportedMetafieldSyncTables(): SupportedMetafieldSyncTable[] {
  return [
    MetafieldOwnerType.Article,
    MetafieldOwnerType.Blog,
    MetafieldOwnerType.Collection,
    MetafieldOwnerType.Customer,
    MetafieldOwnerType.Draftorder,
    MetafieldOwnerType.Location,
    MetafieldOwnerType.Order,
    MetafieldOwnerType.Page,
    MetafieldOwnerType.Product,
    MetafieldOwnerType.Productvariant,
    MetafieldOwnerType.Shop,
  ].map((ownerType) => new SupportedMetafieldSyncTable(ownerType as SupportedMetafieldOwnerType));
}

export function getSupportedMetafieldSyncTable(ownerType: MetafieldOwnerType): SupportedMetafieldSyncTable {
  return new SupportedMetafieldSyncTable(ownerType as SupportedMetafieldOwnerType);
}

export function getAllSupportDefinitionMetafieldSyncTables(): Array<SupportedMetafieldSyncTable> {
  return getSupportedMetafieldSyncTables().filter((r) => r.supportDefinition);
}

export function getSupportDefinitionMetafieldSyncTable(ownerType: MetafieldOwnerType): SupportedMetafieldSyncTable {
  const found = getAllSupportDefinitionMetafieldSyncTables().find((r) => r.ownerType === ownerType);
  if (found) return found;
  throw new UnsupportedValueError('MetafieldOwnerType', ownerType);
}
