// #region Imports
import * as coda from '@codahq/packs-sdk';

import { PageInfo, RestRequestReturn } from '@shopify/shopify-api/lib/clients/types';
import { Body, IdSet, ParamSet, ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { RestClient } from '../../Clients/RestClient';
import { FetchRequestOptions } from '../../Clients/Client.types';
import { REST_DEFAULT_API_VERSION } from '../../config';
import { idToGraphQlGid } from '../../utils/conversion-utils';
import { filterObjectKeys } from '../../utils/helpers';
import { MergedCollection_Custom } from '../Rest/MergedCollection_Custom';
import { GraphQlResourceName } from '../types/GraphQlResource.types';
import { handleDeleteNotFound } from '../utils/abstractResource-utils';
import { AbstractSyncedRestResourceWithRestMetafields } from './Rest/AbstractSyncedRestResourceWithRestMetafields';
// import { RestResourceError } from '@shopify/shopify-api';

// #endregion

// #region Types
export type ResourceName =
  | 'article'
  | 'asset'
  | 'blog'
  | 'collect'
  | 'collection'
  | 'custom_collection'
  | 'smart_collection'
  | 'customer'
  | 'draft_order'
  | 'location'
  | 'order'
  | 'page'
  | 'product_image'
  | 'product'
  | 'variant'
  | 'redirect'
  | 'shop'
  | 'theme';

export type ResourceDisplayName =
  | 'Article'
  | 'Asset'
  | 'Blog'
  | 'Collect'
  | 'Collection'
  | 'Customer'
  | 'Draft Order'
  | 'File'
  | 'Inventory Level'
  | 'Location'
  | 'Media Image'
  | 'Metafield'
  | 'Metaobject'
  | 'Order'
  | 'Order Line Item'
  | 'Page'
  | 'Product'
  | 'Product Variant'
  | 'Redirect'
  | 'Shop'
  | 'Theme';

interface BaseConstructorArgs {
  context: coda.ExecutionContext;
  fromData?: Body | null;
}
// #endregion

export abstract class AbstractResource {
  public static readonly displayName: ResourceDisplayName;
  public apiData: any;

  protected static readonly primaryKey: string = 'id';
  protected static readonly restName: ResourceName;
  protected static readonly graphQlName: GraphQlResourceName | undefined;
  protected static readonly readOnlyAttributes: string[] = [];

  protected context: coda.ExecutionContext;

  /**
   * Normally, the Rest body name is derived from the class name, but in some cases,
   * we need to hardcode the value, e.g. {@link MergedCollection_Custom}
   */
  protected static getRestName(): string {
    return this.restName ?? this.name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }

  // protected static createInstance<T extends AbstractResource = AbstractResource>(
  protected static createInstance<T extends AbstractResource = AbstractResource>(
    context: coda.ExecutionContext,
    data: Body,
    prevInstance?: T
  ): T {
    const instance: T = prevInstance ? prevInstance : new (this as any)({ context });

    if (data) {
      instance.setData(data);
    }

    return instance;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  constructor({ context, fromData }: BaseConstructorArgs) {
    this.context = context;

    if (fromData) {
      this.setData(fromData);
    }
  }

  protected setData(data: Body): void {
    this.apiData = data;
  }

  /**
   * Returns the current class's constructor as a type BaseT, which defaults to the class itself.
   * This allows accessing the constructor type of the current class.
   */
  protected resource<BaseT extends typeof AbstractResource = typeof AbstractResource>(): BaseT {
    return this.constructor as BaseT;
  }
}
