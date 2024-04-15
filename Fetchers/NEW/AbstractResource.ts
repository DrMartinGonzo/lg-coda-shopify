import * as coda from '@codahq/packs-sdk';

import { PageInfo, RestRequestReturn } from '@shopify/shopify-api/lib/clients/types';
import { Body, IdSet, ParamSet, ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { REST_DEFAULT_API_VERSION } from '../../config/config';
import { idToGraphQlGid } from '../../helpers-graphql';
import { GraphQlResourceName } from '../../resources/ShopifyResource.types';
import { filterObjectKeys } from '../../utils/helpers';
import { FetchRequestOptions } from '../Fetcher.types';
import { handleDeleteNotFound } from '../fetcher-helpers';
import { AbstractResource_Synced_HasMetafields } from './AbstractResource_Synced_HasMetafields';
import { MergedCollection_Custom } from './Resources/WithGraphQlMetafields/MergedCollection_Custom';
import { RestClientNEW } from './RestClientNEW';
// import { RestResourceError } from '@shopify/shopify-api';

// #region Types
// export type ResourceName = keyof typeof MetafieldOwnerType;
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

export interface BaseConstructorArgs {
  context: coda.ExecutionContext;
  fromData?: Body | null;
}

export interface RestApiData {
  id: number | null;
  [key: string]: any;
}

export interface BaseContext {
  context: coda.ExecutionContext;
  options?: FetchRequestOptions;
}

interface BaseFindArgs extends BaseContext {
  params?: ParamSet;
  urlIds: IdSet;
}

interface BaseDeleteArgs extends BaseContext {
  params?: ParamSet;
  urlIds: IdSet;
}

interface RequestArgs extends BaseFindArgs {
  http_method: string;
  operation: string;
  body?: Body | null;
  entity?: AbstractResource | null;
}

export interface SaveArgs {
  update?: boolean;
}

interface GetPathArgs {
  http_method: string;
  operation: string;
  urlIds: IdSet;
  entity?: AbstractResource | null;
}

export interface FindAllResponse<T = AbstractResource> {
  data: T[];
  headers: coda.FetchResponse['headers'];
  pageInfo?: PageInfo;
}
// #endregion

export abstract class AbstractResource {
  static readonly displayName: ResourceDisplayName;

  protected static Client = RestClientNEW;
  protected static apiVersion = REST_DEFAULT_API_VERSION;

  protected static primaryKey = 'id';
  protected static resourceNames: ResourceNames[] = [];
  /**
   * Normally, the JSON body name is derived from the class name, but in some cases,
   * we need to hardcode the value, e.g. {@link MergedCollection_Custom}
   */
  protected static jsonBodyName: ResourceName;
  protected static graphQlName: GraphQlResourceName | undefined;
  protected static readOnlyAttributes: string[] = [];

  /** The effective schema for the sync. Can be an augmented schema with metafields */
  protected static _schemaCache: coda.ArraySchema<coda.ObjectSchema<string, string>>;
  protected static paths: ResourcePath[] = [];
  protected context: coda.ExecutionContext;

  public apiData: any;

  protected static getPath({ http_method, operation, urlIds, entity }: GetPathArgs): string {
    let match: string | null = null;
    let specificity = -1;

    const potentialPaths: ResourcePath[] = [];
    this.paths.forEach((path: ResourcePath) => {
      if (http_method !== path.http_method || operation !== path.operation || path.ids.length <= specificity) {
        return;
      }

      potentialPaths.push(path);

      let pathUrlIds: IdSet = { ...urlIds };
      path.ids.forEach((id) => {
        if (!pathUrlIds[id] && entity?.apiData[id]) {
          pathUrlIds[id] = entity.apiData[id];
        }
      });

      pathUrlIds = Object.entries(pathUrlIds).reduce((acc: IdSet, [key, value]: [string, string | number | null]) => {
        if (value) {
          acc[key] = value;
        }
        return acc;
      }, {});

      // If we weren't given all of the path's required ids, we can't use it
      const diff = path.ids.reduce((acc: string[], id: string) => (pathUrlIds[id] ? acc : acc.concat(id)), []);
      if (diff.length > 0) {
        return;
      }

      specificity = path.ids.length;
      match = path.path.replace(/(<([^>]+)>)/g, (_m1, _m2, id) => `${pathUrlIds[id]}`);
    });

    if (!match) {
      const pathOptions = potentialPaths.map((path) => path.path);

      // throw new RestResourceError(
      // TODO: fix
      throw new Error(
        `Could not find a path for request. If you are trying to make a request to one of the following paths, ensure all relevant IDs are set. :\n - ${pathOptions.join(
          '\n - '
        )}`
      );
    }

    return match;
  }

  protected static async baseFind<T extends AbstractResource = AbstractResource>({
    urlIds,
    params,
    context,
    options,
  }: BaseFindArgs): Promise<FindAllResponse<T>> {
    const response = await this.request<T>({
      http_method: 'get',
      operation: 'get',
      context,
      urlIds,
      params,
      options,
    });

    return {
      data: this.createInstancesFromResponse<T>(context, response.body as Body),
      headers: response.headers,
      pageInfo: response.pageInfo,
    };
  }

  protected static async baseDelete<T = unknown>({ urlIds, params, context }: BaseDeleteArgs) {
    return this.request<T>({
      http_method: 'delete',
      operation: 'delete',
      context: context,
      urlIds,
      params,
    });
  }

  protected static async request<T = unknown>({
    context,
    http_method,
    operation,
    urlIds,
    params,
    body,
    entity,
    options,
  }: RequestArgs): Promise<RestRequestReturn<T>> {
    const client = new this.Client({
      context,
      apiVersion: this.apiVersion,
    });

    const path = this.getPath({ http_method, operation, urlIds, entity });

    const cleanParams: Record<string, string | number> = {};
    if (params) {
      for (const key in params) {
        if (params[key] !== null) {
          cleanParams[key] = params[key];
        }
      }
    }

    switch (http_method) {
      case 'get':
        return client.get<T>({ path, query: cleanParams, options });
      case 'post':
        return client.post<T>({
          path,
          query: cleanParams,
          data: body!,
        });
      case 'put':
        return client.put<T>({
          path,
          query: cleanParams,
          data: body!,
        });
      case 'delete':
        try {
          const deleteResponse = await client.delete<T>({ path, query: cleanParams });
          return deleteResponse;
        } catch (error) {
          handleDeleteNotFoundNEW(this.getJsonBodyName(), path);
          return;
        }
      default:
        throw new Error(`Unrecognized HTTP method "${http_method}"`);
    }
  }

  protected static getJsonBodyName(): string {
    return this.jsonBodyName ?? this.name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }

  protected static createInstancesFromResponse<T extends AbstractResource = AbstractResource>(
    context: coda.ExecutionContext,
    data: Body
  ): T[] {
    let instances: T[] = [];
    this.resourceNames.forEach((resourceName) => {
      const singular = resourceName.singular;
      const plural = resourceName.plural;
      if (data[plural] || Array.isArray(data[singular])) {
        instances = instances.concat(
          (data[plural] || data[singular]).reduce(
            (acc: T[], entry: Body) => acc.concat(this.createInstance<T>(context, entry)),
            []
          )
        );
      } else if (data[singular]) {
        instances.push(this.createInstance<T>(context, data[singular]));
      }
    });

    return instances;
  }

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

  get graphQlGid(): string {
    if ('admin_graphql_api_id' in this.apiData) {
      return this.apiData.admin_graphql_api_id;
    }
    return idToGraphQlGid(this.resource().graphQlName, this.apiData.id);
  }

  /**
   * Returns the current class's constructor as a type BaseT, which defaults to the class itself.
   * This allows accessing the constructor type of the current class.
   */
  protected resource<BaseT extends typeof AbstractResource = typeof AbstractResource>(): BaseT {
    return this.constructor as unknown as BaseT;
  }

  protected setData(data: Body): void {
    this.apiData = data;
  }

  public async save({ update = false }: SaveArgs = {}): Promise<void> {
    const staticResource = this.resource();

    const { primaryKey, resourceNames } = staticResource;
    const method = this.apiData[primaryKey] ? 'put' : 'post';

    const response = await staticResource.request({
      http_method: method,
      operation: method,
      context: this.context,
      urlIds: {},
      /** When performing a PUT request, we must create/update/delete metafields
       * individually. This will be done by {@link AbstractResource_Synced_HasMetafields} class */
      body: {
        [staticResource.getJsonBodyName()]:
          method === 'put' ? filterObjectKeys(this.apiData, ['metafields']) : this.apiData,
      },
      entity: this,
    });

    const flattenResourceNames: string[] = resourceNames.reduce<string[]>((acc, obj) => {
      return acc.concat(Object.values(obj));
    }, []);

    const matchResourceName = Object.keys(response.body as Body).filter((key: string) =>
      flattenResourceNames.includes(key)
    );

    const body: Body | undefined = (response.body as Body)[matchResourceName[0]];

    if (update && body) {
      this.setData(body);
    }
  }
  public async saveAndUpdate(): Promise<void> {
    await this.save({ update: true });
  }

  public async delete(): Promise<void> {
    await this.resource().request({
      http_method: 'delete',
      operation: 'delete',
      context: this.context,
      urlIds: {},
      entity: this,
    });
  }

  public request<T = unknown>(args: RequestArgs) {
    return this.resource().request<T>(args);
  }
}
