// #region Imports
import * as coda from '@codahq/packs-sdk';

import { PageInfo, RestRequestReturn } from '@shopify/shopify-api/lib/clients/types';
import { Body, IdSet, ParamSet, ResourceNames, ResourcePath } from '@shopify/shopify-api/rest/types';
import { BaseContext } from '../../../Clients/Client.types';
import { RestClient } from '../../../Clients/RestClient';
import { REST_DEFAULT_API_VERSION } from '../../../config';
import { idToGraphQlGid } from '../../../utils/conversion-utils';
import { filterObjectKeys } from '../../../utils/helpers';
import { MergedCollection_Custom } from '../../Rest/MergedCollection_Custom';
import { handleDeleteNotFound } from '../../utils/abstractResource-utils';
import { AbstractResource } from '../AbstractResource';
import { AbstractSyncedRestResourceWithRestMetafields } from './AbstractSyncedRestResourceWithRestMetafields';

// #region Types
export interface BaseConstructorArgs {
  context: coda.ExecutionContext;
  fromData?: Body | null;
}

export interface RestApiData {
  id: number | null;
  [key: string]: any;
}

interface GetPathArgs {
  http_method: string;
  operation: string;
  urlIds: IdSet;
  entity?: AbstractRestResource | null;
}

export interface FindAllResponse<T> {
  data: Array<T>;
  headers: coda.FetchResponse['headers'];
  pageInfo?: PageInfo;
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
  entity?: AbstractRestResource | null;
}

export interface SaveArgs {
  update?: boolean;
}
// #endregion

export abstract class AbstractRestResource extends AbstractResource {
  protected static Client = RestClient;
  protected static apiVersion = REST_DEFAULT_API_VERSION;
  protected static readonly resourceNames: ResourceNames[] = [];
  protected static readonly paths: ResourcePath[] = [];

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

  /**
   * Normally, the Rest body name is derived from the class name, but in some cases,
   * we need to hardcode the value, e.g. {@link MergedCollection_Custom}
   */
  protected static getRestName(): string {
    return this.restName ?? this.name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
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
          if (coda.StatusCodeError.isStatusCodeError(error)) {
            const statusError = error as coda.StatusCodeError;
            if (statusError.statusCode === 404) {
              handleDeleteNotFound(this.getRestName(), path);
            }
          }
          return;
        }
      default:
        throw new Error(`Unrecognized HTTP method "${http_method}"`);
    }
  }

  protected static async baseFind<T extends AbstractRestResource = AbstractRestResource>({
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

  protected static createInstancesFromResponse<T extends AbstractRestResource = AbstractRestResource>(
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

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  get graphQlGid(): string {
    if ('admin_graphql_api_id' in this.apiData) {
      return this.apiData.admin_graphql_api_id;
    }
    return idToGraphQlGid(this.resource<typeof AbstractRestResource>().graphQlName, this.apiData.id);
  }

  public request<T = unknown>(args: RequestArgs) {
    return this.resource<typeof AbstractRestResource>().request<T>(args);
  }

  public async save({ update = false }: SaveArgs = {}): Promise<void> {
    const staticResource = this.resource<typeof AbstractRestResource>();
    const { primaryKey, resourceNames } = staticResource;
    const method = this.apiData[primaryKey] ? 'put' : 'post';

    const response = await staticResource.request({
      http_method: method,
      operation: method,
      context: this.context,
      urlIds: {},
      // TODO: try not to have to filter metafields from apiData
      /** When performing a PUT request, we must create/update/delete metafields
       * individually. This will be done by {@link AbstractSyncedRestResourceWithRestMetafields} class */
      body: {
        [staticResource.getRestName()]:
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
    await this.resource<typeof AbstractRestResource>().request({
      http_method: 'delete',
      operation: 'delete',
      context: this.context,
      urlIds: {},
      entity: this,
    });
  }
}
