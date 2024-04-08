import * as coda from '@codahq/packs-sdk';

import { ClientGraphQl, graphQlFetchParams } from '../../Fetchers/ClientGraphQl';
import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { graphQlGidToId } from '../../helpers-graphql';
import { MetaobjectRow } from '../../schemas/CodaRows.types';
import {
  MetaobjectCreateInput,
  MetaobjectFieldInput,
  MetaobjectStatus,
  MetaobjectUpdateInput,
} from '../../types/admin.types';
import { ResultOf, VariablesOf } from '../../utils/graphql';
import { AllMetafieldTypeValue } from '../metafields/metafields-constants';
import { formatMetaFieldValueForSchema, formatMetafieldValueForApi } from '../metafields/metafields-functions';
import { shouldUpdateSyncTableMetafieldValue } from '../metafields/metafields-helpers';
import { Metaobject, metaobjectResource } from './metaobjectResource';
import { requireMatchingMetaobjectFieldDefinition } from './metaobjects-functions';
import {
  metaobjectFieldDefinitionFragment,
  createMetaobjectMutation,
  deleteMetaobjectMutation,
  metaobjectFragment,
  getSingleMetaObjectWithFieldsQuery,
  updateMetaObjectMutation,
} from './metaobjects-graphql';

interface FetchSingleParams extends graphQlFetchParams {
  fields?: string[];
  includeCapabilities?: boolean;
  includeFieldDefinitions?: boolean;
}
interface UpdateParams {
  gid: string;
  updateInput: MetaobjectUpdateInput;
}
interface CreateParams {
  createInput: MetaobjectCreateInput;
}

export class MetaobjectGraphQlFetcher extends ClientGraphQl<Metaobject> {
  constructor(context: coda.ExecutionContext) {
    super(metaobjectResource, context);
  }

  /**
   * Formats metaobjectFragment node into a MetaobjectRow.
   *
   * @param node - the metaobjectFragment node to be formatted
   * @param schemaWithIdentity wether the data will be consumed by an action wich results use a coda.withIdentity schema. Useful to prevent breaking existing relations
   * @return {MetaobjectRow} the formatted MetaobjectRow
   */
  formatApiToRow(node: ResultOf<typeof metaobjectFragment>, schemaWithIdentity = false): MetaobjectRow {
    let obj: MetaobjectRow = {
      id: graphQlGidToId(node.id),
      admin_graphql_api_id: node.id,
      handle: node.handle,
      admin_url: `${this.context.endpoint}/admin/content/entries/${node.type}/${graphQlGidToId(node.id)}`,
      status: node.capabilities?.publishable?.status,
      updatedAt: node.updatedAt,
    };

    if (node.capabilities?.publishable?.status) {
      obj.status = node.capabilities.publishable.status;
    }

    if (node.fields.length) {
      node.fields
        .filter((field) => shouldUpdateSyncTableMetafieldValue(field.type, schemaWithIdentity))
        .forEach((field) => {
          obj[field.key] = formatMetaFieldValueForSchema({
            value: field.value,
            type: field.type,
          });
        });
    }

    return obj;
  }

  async formatMetaobjectFieldInputs(
    row: MetaobjectRow,
    metaobjectFieldDefinitions: Array<ResultOf<typeof metaobjectFieldDefinitionFragment>>
  ) {
    const metaobjectFieldFromKeys = Object.keys(row).filter((key) => !['id', 'handle', 'status'].includes(key));
    return Promise.all(
      metaobjectFieldFromKeys.map(async (fromKey): Promise<MetaobjectFieldInput> => {
        const value = row[fromKey] as string;
        const fieldDefinition = requireMatchingMetaobjectFieldDefinition(fromKey, metaobjectFieldDefinitions);

        let formattedValue: string;
        try {
          formattedValue = await formatMetafieldValueForApi(
            value,
            fieldDefinition.type.name as AllMetafieldTypeValue,
            this.context,
            fieldDefinition.validations
          );
        } catch (error) {
          throw new coda.UserVisibleError(`Unable to format value for Shopify API for key ${fromKey}.`);
        }

        return {
          key: fromKey,
          value: formattedValue ?? '',
        };
      })
    );
  }

  formatMetaobjectUpdateInput(row: Omit<MetaobjectRow, 'id'>, metaobjectFieldInputs: Array<MetaobjectFieldInput>) {
    return this.formatRowToApi(row, metaobjectFieldInputs) as MetaobjectUpdateInput;
  }
  formatMetaobjectCreateInput(
    type: string,
    row: Omit<MetaobjectRow, 'id'>,
    metaobjectFieldInputs: Array<MetaobjectFieldInput>
  ) {
    return {
      type: type,
      ...this.formatRowToApi(row, metaobjectFieldInputs),
    } as MetaobjectCreateInput;
  }
  formatRowToApi(row: Omit<MetaobjectRow, 'id'>, metaobjectFieldInputs: Array<MetaobjectFieldInput>) {
    const ret: MetaobjectUpdateInput | MetaobjectCreateInput = {};

    if (row.handle && row.handle !== '') {
      ret.handle = row.handle;
    }
    if (row.status && row.status !== '') {
      ret.capabilities = { publishable: { status: row.status as MetaobjectStatus } };
    }
    if (metaobjectFieldInputs && metaobjectFieldInputs.length) {
      ret.fields = metaobjectFieldInputs;
    }

    if (Object.keys(ret).filter((key) => key !== 'type').length === 0) return undefined;
    return ret;
  }

  async fetch(params: FetchSingleParams, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      id: params.gid,
      includeDefinition: params.includeFieldDefinitions ?? false,
      includeCapabilities: params.includeCapabilities ?? false,
      includeFieldDefinitions: params.includeFieldDefinitions ?? false,
    } as VariablesOf<typeof getSingleMetaObjectWithFieldsQuery>;

    return this.makeRequest(getSingleMetaObjectWithFieldsQuery, variables, requestOptions);
  }

  async create(params: CreateParams, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      metaobject: params.createInput,
    } as VariablesOf<typeof createMetaobjectMutation>;

    return this.makeRequest(createMetaobjectMutation, variables, requestOptions);
  }

  async update(params: UpdateParams, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      id: params.gid,
      metaobject: params.updateInput,
      includeDefinition: false,
      includeCapabilities: params.updateInput.hasOwnProperty('capabilities'),
      includeFieldDefinitions: false,
    } as VariablesOf<typeof updateMetaObjectMutation>;

    return this.makeRequest(updateMetaObjectMutation, variables, requestOptions);
  }

  /**
   * Delete metaobject with the given metaobject GID.
   * @param metaobjectGid - The GraphQL GID of the metaobject to delete.
   * @param requestOptions - The fetch request options. See {@link FetchRequestOptions}
   */
  async delete(metaobjectGid: string, requestOptions: FetchRequestOptions = {}) {
    const variables = {
      id: metaobjectGid,
    } as VariablesOf<typeof deleteMetaobjectMutation>;

    return this.makeRequest(deleteMetaobjectMutation, variables, requestOptions);
  }
}
