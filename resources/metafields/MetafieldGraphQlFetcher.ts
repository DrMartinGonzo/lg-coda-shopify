import * as coda from '@codahq/packs-sdk';

import { ClientGraphQl } from '../../Fetchers/ClientGraphQl';
import { FetchRequestOptions, MetafieldClient } from '../../Fetchers/Fetcher.types';
import { graphQlGidToId, graphQlGidToResourceName } from '../../helpers-graphql';
import { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { MetafieldRow } from '../../schemas/CodaRows.types';
import { formatMetaFieldValueForSchema } from '../../schemas/schema-helpers';
import { formatMetafieldDefinitionReference } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { metafieldSyncTableHelperEditColumns } from '../../schemas/syncTable/MetafieldSchema';
import { MetafieldsSetInput } from '../../types/admin.types';
import { ResultOf, VariablesOf, readFragment, readFragmentArray } from '../../utils/graphql';
import { ResourceWithMetafields } from '../Resource.types';
import {
  deleteMetafieldMutation,
  getResourceMetafieldsByKeysQueryFromOwnerType,
  getSingleNodeMetafieldsByKeyQuery,
  metafieldFieldsFragmentWithDefinition,
  setMetafieldsMutation,
} from '../metafields/metafields-graphql';
import {
  getMetaFieldFullKey,
  getResourceMetafieldsAdminUrl,
  preprendPrefixToMetaFieldKey,
  shouldDeleteMetafield,
  shouldUpdateSyncTableMetafieldValue,
  splitMetaFieldFullKey,
} from '../metafields/metafields-helpers';
import { MetafieldOwnerNode } from './Metafield.types';
import { MetafieldRestFetcher } from './MetafieldRestFetcher';
import { DeletedMetafieldsByKeysRest } from './deleteMetafieldsByKeysRestNew';
import { Metafield, metafieldResource } from './metafieldResource';
import { formatMetafieldOwnerRelation } from './metafields-functions';
import { GRAPHQL_NODES_LIMIT } from '../../constants';
import { GraphQlFetchResponse } from '../../Fetchers/SyncTableGraphQl';

export class MetafieldGraphQlFetcher extends ClientGraphQl<Metafield> implements MetafieldClient {
  ownerResource: ResourceWithMetafields<any, any>;

  constructor(ownerResource: ResourceWithMetafields<any, any>, context: coda.ExecutionContext) {
    super(metafieldResource, context);
    this.ownerResource = ownerResource;
  }

  /**
   * Formate un objet MetafieldRestInput pour GraphQL Admin API
   * depuis un paramètre Coda utilisant une formule `MetafieldKeyValueSet(…)`
   */
  formatGraphQlInputFromMetafieldKeyValueSet(ownerGid: string, metafieldKeyValueSet: CodaMetafieldKeyValueSet) {
    const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafieldKeyValueSet.key);
    if (metafieldKeyValueSet.value !== null) {
      return {
        ownerId: ownerGid,
        key: metaKey,
        namespace: metaNamespace,
        type: metafieldKeyValueSet.type,
        value:
          typeof metafieldKeyValueSet.value === 'string'
            ? metafieldKeyValueSet.value
            : JSON.stringify(metafieldKeyValueSet.value),
      } as MetafieldsSetInput;
    }
  }

  formatApiToRow(
    metafieldNode: ResultOf<typeof metafieldFieldsFragmentWithDefinition>,
    ownerNode?: Partial<MetafieldOwnerNode>,
    includeHelperColumns: boolean = true
  ): MetafieldRow {
    const fullKey = getMetaFieldFullKey(metafieldNode);
    const { metaKey, metaNamespace } = splitMetaFieldFullKey(fullKey);
    const ownerId = graphQlGidToId(ownerNode.id);
    const parentOwnerId = 'parentOwner' in ownerNode ? graphQlGidToId(ownerNode.parentOwner.id) : undefined;
    const hasMetafieldDefinition = !!metafieldNode.definition;

    let obj: MetafieldRow = {
      admin_graphql_api_id: metafieldNode.id,
      id: graphQlGidToId(metafieldNode.id),
      key: metaKey,
      namespace: metaNamespace,
      label: fullKey,
      owner_id: ownerId,
      owner_type: this.ownerResource.metafields.ownerType,
      owner: formatMetafieldOwnerRelation(this.ownerResource.graphQl.name, ownerId),
      rawValue: metafieldNode.value,
      type: metafieldNode.type,
      created_at: metafieldNode.createdAt,
      updated_at: metafieldNode.updatedAt,
    };

    if (metafieldNode?.definition?.id) {
      const definitionId = graphQlGidToId(metafieldNode.definition.id);
      obj.definition_id = definitionId;
      obj.definition = formatMetafieldDefinitionReference(definitionId);
    }
    /**
     * We don't set it at once because parentOwnerId can be necessary but
     * undefined when formatting from a two way sync update (ex: ProductVariants).
     * Since this value is static, we return nothing to prevent erasing the
     * previous value. We could also retrieve the owner ID value directly in the
     * graphQl mutation result but doing it this way reduce the GraphQL query costs.
     */
    const maybeAdminUrl = getResourceMetafieldsAdminUrl(
      this.context,
      this.ownerResource,
      hasMetafieldDefinition,
      ownerId,
      parentOwnerId
    );
    if (maybeAdminUrl) {
      obj.admin_url = maybeAdminUrl;
    }

    // switch (this.ownerResource.graphQl.name) {
    //   case GraphQlResourceName.OnlineStoreArticle:
    //     obj.owner = formatArticleReference(ownerId);
    //     break;
    //   case GraphQlResourceName.OnlineStoreBlog:
    //     obj.owner = formatBlogReference(ownerId);
    //     break;
    //   case GraphQlResourceName.Collection:
    //     obj.owner = formatCollectionReference(ownerId);
    //     break;
    //   case GraphQlResourceName.Customer:
    //     obj.owner = formatCustomerReference(ownerId);
    //     break;
    //   case GraphQlResourceName.Location:
    //     obj.owner = formatLocationReference(ownerId);
    //     break;
    //   case GraphQlResourceName.Order:
    //     obj.owner = formatOrderReference(ownerId);
    //     break;
    //   case GraphQlResourceName.OnlineStorePage:
    //     obj.owner = formatPageReference(ownerId);
    //     break;
    //   case GraphQlResourceName.Product:
    //     obj.owner = formatProductReference(ownerId);
    //     break;
    //   case GraphQlResourceName.ProductVariant:
    //     obj.owner = formatProductVariantReference(ownerId);
    //     break;
    // }

    if (includeHelperColumns) {
      const helperColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === metafieldNode.type);
      if (helperColumn) {
        obj[helperColumn.key] = formatMetaFieldValueForSchema(metafieldNode);
      }
    }

    return obj;
  }

  async set(metafieldsSetInputs: MetafieldsSetInput[], requestOptions: FetchRequestOptions = {}) {
    const variables = {
      inputs: metafieldsSetInputs,
    } as VariablesOf<typeof setMetafieldsMutation>;

    return this.makeRequest(setMetafieldsMutation, variables, requestOptions);
  }

  async delete(metafieldGid: string, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      input: {
        id: metafieldGid,
      },
    } as VariablesOf<typeof deleteMetafieldMutation>;
    return this.makeRequest(deleteMetafieldMutation, variables, requestOptions);
  }

  async fetchAllNodeMetafields(ownerGid: string, keys: Array<string>, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      ownerGid,
      countMetafields: !keys || !keys.length ? GRAPHQL_NODES_LIMIT : keys.length,
      metafieldKeys: keys ?? [],
    } as VariablesOf<typeof getSingleNodeMetafieldsByKeyQuery>;

    return this.makeRequest(getSingleNodeMetafieldsByKeyQuery, variables, requestOptions);
  }

  /*
  async deleteMetafieldsByKeys(
    ownerGid: string,
    metafieldsToDelete: Array<CodaMetafieldKeyValueSet>
  ): Promise<DeletedMetafieldsByKeysRest[]> {
    // const filteredMetafieldKeys = Array.isArray(metafieldKeysParam)
    //   ? metafieldKeysParam.filter((key) => key !== undefined && key !== '')
    //   : [];

    const documentNode = getResourceMetafieldsByKeysQueryFromOwnerType(this.ownerResource.metafields.ownerType);

    const variables = {
      maxEntriesPerRun: this.maxEntriesPerRun,
      cursor: this.prevContinuation?.cursor ?? null,
      metafieldKeys: filteredMetafieldKeys,
      countMetafields: filteredMetafieldKeys.length ? filteredMetafieldKeys.length : GRAPHQL_NODES_LIMIT,
    } as VariablesOf<typeof documentNode>;

    const response = await this.fetchAllNodeMetafields();

    if (response?.body?.metafields) {
      const promises = metafieldsToDelete.map(async (metafieldKeyValueSet) => {
        const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafieldKeyValueSet.key);
        const metafield = response.body.metafields.find((m) => m.key === metaKey && m.namespace === metaNamespace);
        if (metafield !== undefined) {
          try {
            await this.delete(metafield.id);
            // await deleteMetafieldRest(metafield.id, context);
          } catch (error) {
            // If the request failed because the server returned a 300+ status code.
            if (coda.StatusCodeError.isStatusCodeError(error)) {
              const statusError = error as coda.StatusCodeError;
              if (statusError.statusCode === 404) {
                console.error(
                  `Metafield ${metafieldKeyValueSet.key} not found for resource ${this.ownerResource.rest.singular} with ID ${this.ownerId}. Possibly already deleted.`
                );
              }
            }
            // The request failed for some other reason. Re-throw the error so that it bubbles up.
            throw error;
          }
        } else {
          console.error(
            `Metafield ${metafieldKeyValueSet.key} not found for resource ${this.ownerResource.rest.singular} with ID ${this.ownerId}. Possibly already deleted.`
          );
        }

        // If no errors were thrown, then the metafield was deleted.
        return {
          id: metafield?.id,
          namespace: metaNamespace,
          key: metaKey,
        } as DeletedMetafieldsByKeysRest;
      });

      const results = await Promise.all(promises);
      return results.filter((r) => !!r);
    }

    return [];
  }
  */

  async createUpdateDelete(
    ownerGid: string,
    metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet>
  ): Promise<{
    deletedMetafields: Array<DeletedMetafieldsByKeysRest>;
    updatedMetafields: Array<ResultOf<typeof metafieldFieldsFragmentWithDefinition>>;
  }> {
    const metafieldsToDelete = metafieldKeyValueSets.filter((set) => shouldDeleteMetafield(set.value));
    const metafieldsToUpdate = metafieldKeyValueSets.filter((set) => !shouldDeleteMetafield(set.value));

    // const graphQlResourceName = graphQlGidToResourceName(ownerGid);

    // let deletedMetafields: DeletedMetafieldsByKeysRest[] = [];
    const updatedMetafields: Array<ResultOf<typeof metafieldFieldsFragmentWithDefinition>> = [];

    const metafieldFetcher = new MetafieldRestFetcher(this.ownerResource, graphQlGidToId(ownerGid), this.context);
    const promises: (Promise<any> | undefined)[] = [];
    if (metafieldsToDelete.length) {
      promises.push(metafieldFetcher.deleteMetafieldsByKeys(metafieldsToDelete));
    } else {
      promises.push(undefined);
    }

    if (metafieldsToUpdate.length) {
      const metafieldsSetInputs = metafieldsToUpdate
        .map((m) => this.formatGraphQlInputFromMetafieldKeyValueSet(ownerGid, m))
        .filter(Boolean);

      promises.push(this.set(metafieldsSetInputs));
    } else {
      promises.push(undefined);
    }

    const [deletedMetafields, metafieldsSetResponse] = (await Promise.all(promises)) as [
      Array<DeletedMetafieldsByKeysRest>,
      GraphQlFetchResponse<typeof setMetafieldsMutation>
    ];

    return {
      deletedMetafields: deletedMetafields ? deletedMetafields.filter(Boolean) : [],
      updatedMetafields: metafieldsSetResponse?.body?.data?.metafieldsSet?.metafields
        ? readFragmentArray(
            metafieldFieldsFragmentWithDefinition,
            metafieldsSetResponse.body.data.metafieldsSet.metafields
          )
        : [],
      //  updatedMetafields.filter(Boolean) : [],
    };

    // if (graphQlResourceName && metafieldsToDelete.length) {
    //   deletedMetafields = await metafieldFetcher.deleteMetafieldsByKeys(metafieldsToDelete);
    //   // deletedMetafields = await deleteMetafieldsByKeysRestNew(
    //   //   metafieldsToDelete,
    //   //   graphQlGidToId(ownerGid),
    //   //   this.ownerResource,
    //   //   this.context
    //   // );
    // }

    // if (metafieldsToUpdate.length) {
    //   const metafieldsSetInputs = metafieldsToUpdate
    //     .map((m) => this.formatGraphQlInputFromMetafieldKeyValueSet(ownerGid, m))
    //     .filter(Boolean);

    //   const updateResponse = await this.set(metafieldsSetInputs);
    //   if (updateResponse) {
    //     const { data } = updateResponse.body;
    //     if (data?.metafieldsSet?.metafields?.length) {
    //       const metafields = readFragment(metafieldFieldsFragmentWithDefinition, data.metafieldsSet.metafields);
    //       metafields.forEach((metafield) => {
    //         updatedMetafields.push(metafield);
    //       });
    //     }
    //   }
    // }

    // return { deletedMetafields, updatedMetafields };
  }

  /**
   * Perform metafields update / deletions using GraphQL Admin API and return the
   * result formatted in a way to be incorporated in a sync table row
   */
  async updateAndFormatMetafields(params: {
    ownerGid: string;
    metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet>;
    /** Wether the data will be consumed by an action wich result use a `coda.withIdentity` schema. */
    schemaWithIdentity?: boolean;
  }): Promise<{ [key: string]: any }> {
    let obj = {};

    const { deletedMetafields, updatedMetafields } = await this.createUpdateDelete(
      params.ownerGid,
      params.metafieldKeyValueSets
    );
    if (deletedMetafields.length) {
      deletedMetafields.forEach((m) => {
        const prefixedKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(m));
        obj[prefixedKey] = undefined;
      });
    }

    if (updatedMetafields.length) {
      updatedMetafields.forEach((metafield) => {
        const matchingSchemaKey = preprendPrefixToMetaFieldKey(getMetaFieldFullKey(metafield));
        if (shouldUpdateSyncTableMetafieldValue(metafield.type, params.schemaWithIdentity)) {
          obj[matchingSchemaKey] = this.formatApiToRow(metafield, {
            id: params.ownerGid,
          });
        }
      });
    }

    return obj;
  }
}
