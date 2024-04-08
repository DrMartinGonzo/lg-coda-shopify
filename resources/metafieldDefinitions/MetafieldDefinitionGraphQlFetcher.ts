import * as coda from '@codahq/packs-sdk';

import { GraphQlClientWithSchema } from '../../Fetchers/Client/GraphQl/GraphQlClientWithSchema';
import { graphQlGidToId } from '../../helpers-graphql';
import { MetafieldDefinitionRow } from '../../schemas/CodaRows.types';
import { ResultOf } from '../../utils/graphql';
import { MetafieldDefinition, metafieldDefinitionResource } from './metafieldDefinitionResource';
import { metafieldDefinitionFragment } from './metafieldDefinitions-graphql';

export class MetafieldDefinitionGraphQlFetcher extends GraphQlClientWithSchema<MetafieldDefinition> {
  constructor(context: coda.ExecutionContext) {
    super(metafieldDefinitionResource, context);
  }

  formatApiToRow(metafieldDefinitionNode: ResultOf<typeof metafieldDefinitionFragment>): MetafieldDefinitionRow {
    const definitionId = graphQlGidToId(metafieldDefinitionNode.id);
    let obj: MetafieldDefinitionRow = {
      ...metafieldDefinitionNode,
      admin_graphql_api_id: metafieldDefinitionNode.id,
      id: definitionId,
      admin_url: `${
        this.context.endpoint
      }/admin/settings/custom_data/${metafieldDefinitionNode.ownerType.toLowerCase()}/metafields/${definitionId}`,
      ownerType: metafieldDefinitionNode.ownerType,
      type: metafieldDefinitionNode.type?.name,
    };

    return obj;
  }

  // formatRowToApi(row: MetafieldDefinitionRow, metafieldKeyValueSets?: any[]) {
  //   const ret: VariablesOf<typeof updateMetafieldDefinitionsMutation>['metafieldDefinitions'][0] = {
  //     id: row.id,
  //   };

  //   if (row.name !== undefined) {
  //     if (isNullOrEmpty(row.name)) {
  //       throw new coda.UserVisibleError("MetafieldDefinition name can't be empty");
  //     }
  //     ret.metafieldDefinitionname = row.name;
  //   }
  //   // alt is the only value that can be an empty string
  //   if (row.alt !== undefined) {
  //     ret.alt = row.alt;
  //   }

  //   // Means we have nothing to update
  //   if (Object.keys(ret).length <= 1) return undefined;
  //   return ret;
  // }

  // async fetch(metafieldDefinitionGid: string, requestOptions: FetchRequestOptions = {}) {
  //   const variables = {
  //     id: metafieldDefinitionGid,
  //     includeAlt: true,
  //     includeCreatedAt: true,
  //     includeDuration: true,
  //     includeMetafieldDefinitionSize: true,
  //     includeHeight: true,
  //     includeMimeType: true,
  //     includeThumbnail: true,
  //     includeUpdatedAt: true,
  //     includeUrl: true,
  //     includeWidth: true,
  //   } as VariablesOf<typeof getSingleMetafieldDefinitionQuery>;

  //   // TODO
  //   return this.makeRequest(getSingleMetafieldDefinitionQuery, variables, requestOptions) as unknown as coda.FetchResponse<
  //     GraphQlResponse<{ node: ResultOf<typeof metafieldDefinitionFieldsFragment> }>
  //   >;
  // }

  // async update(
  //   metafieldDefinitionUpdateInput: VariablesOf<typeof updateMetafieldDefinitionsMutation>['metafieldDefinitions'],
  //   requestOptions: FetchRequestOptions = {}
  // ) {
  //   const variables = {
  //     metafieldDefinitions: metafieldDefinitionUpdateInput,
  //     includeAlt: true,
  //     includeCreatedAt: true,
  //     includeDuration: true,
  //     includeMetafieldDefinitionSize: true,
  //     includeHeight: true,
  //     includeMimeType: true,
  //     includeThumbnail: true,
  //     includeUpdatedAt: true,
  //     includeUrl: true,
  //     includeWidth: true,
  //   } as VariablesOf<typeof updateMetafieldDefinitionsMutation>;

  //   return this.makeRequest(updateMetafieldDefinitionsMutation, variables, requestOptions);
  // }

  // /**
  //  * Delete metafieldDefinitions with the given metafieldDefinition GIDs.
  //  * @param metafieldDefinitionGids - The GraphQL GIDs of the metafieldDefinitions to be deleted.
  //  * @param requestOptions - The fetch request options. See {@link FetchRequestOptions}
  //  */
  // async delete(metafieldDefinitionGids: Array<string>, requestOptions: FetchRequestOptions = {}) {
  //   const variables = {
  //     metafieldDefinitionIds: metafieldDefinitionGids,
  //   } as VariablesOf<typeof deleteMetafieldDefinitionsMutation>;

  //   return this.makeRequest(deleteMetafieldDefinitionsMutation, variables, requestOptions);
  // }
}
