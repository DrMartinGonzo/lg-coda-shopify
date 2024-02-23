// #region Imports
import * as coda from '@codahq/packs-sdk';

import { MetafieldDefinitionSchema } from '../schemas/syncTable/MetafieldDefinitionSchema';
import { getRestResourceFromGraphQlResourceType } from '../helpers-rest';
import {
  MetafieldFragmentWithDefinition,
  ResourceMetafieldsSyncTableDefinition,
  SupportedGraphQlResourceWithMetafields,
} from '../types/Metafields';
import { GraphQlResource } from '../types/RequestsGraphQl';
import { RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS } from '../metafields/metafields-constants';
import { requireResourceMetafieldsSyncTableDefinition } from '../metafields/metafields-functions';
import { SyncTableGraphQlContinuation } from '../types/tableSync';
import {
  getGraphQlSyncTableMaxEntriesAndDeferWait,
  idToGraphQlGid,
  makeSyncTableGraphQlRequest,
  skipGraphQlSyncTableRun,
} from '../helpers-graphql';
import { queryMetafieldDefinitions } from './metafieldDefinitions-graphql';
import { GetMetafieldDefinitionsQueryVariables, MetafieldDefinitionFragment } from '../types/admin.generated';
import {
  fetchSingleMetafieldDefinitionGraphQl,
  formatMetafieldDefinitionForSchemaFromGraphQlApi,
} from './metafieldDefinitions-functions';
import { CACHE_DEFAULT, IDENTITY_METAFIELD_DEFINITION } from '../constants';

// #endregion

// #region Helpers
async function getMetafieldDefinitionSchema(
  context: coda.ExecutionContext,
  _: string,
  formulaContext: coda.MetadataContext
) {
  return MetafieldDefinitionSchema;
}

const parameters = {
  inputMetafieldDefinitionID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'metafieldDefinitionId',
    description: 'The ID of the metafield definition.',
  }),
};
// #endregion

// #region Sync tables
export const Sync_MetafieldDefinitions = coda.makeDynamicSyncTable({
  name: 'MetafieldDefinitions',
  description: 'Return Metafield Definitions from this shop.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  identityName: IDENTITY_METAFIELD_DEFINITION,
  listDynamicUrls: async function (context, docUrl: String) {
    return RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS.filter((v) => v.supportMetafieldDefinitions).map((v) => ({
      display: v.display,
      value: v.key,
      hasChildren: false,
    }));
  },
  getName: async function (context) {
    const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
    const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
    return `MetafieldDefinitions_${resourceMetafieldsSyncTableDefinition.display}`;
  },
  /* Direct access to the metafield definition settings page for the resource */
  getDisplayUrl: async function (context) {
    const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
    const restResource = getRestResourceFromGraphQlResourceType(graphQlResource);
    const metafieldDefinitionsUrlPart = restResource.singular;
    return `${context.endpoint}/admin/settings/custom_data/${metafieldDefinitionsUrlPart}/metafields`;
  },
  getSchema: getMetafieldDefinitionSchema,
  defaultAddDynamicColumns: false,
  formula: {
    name: 'SyncMetafieldDefinitions',
    description: '<Help text for the sync formula, not show to the user>',
    parameters: [],
    execute: async function ([], context) {
      const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
      const prevContinuation = context.sync.continuation as SyncTableGraphQlContinuation;
      const defaultMaxEntriesPerRun = 200;
      const { maxEntriesPerRun, shouldDeferBy } = await getGraphQlSyncTableMaxEntriesAndDeferWait(
        defaultMaxEntriesPerRun,
        prevContinuation,
        context
      );
      if (shouldDeferBy > 0) {
        return skipGraphQlSyncTableRun(prevContinuation as unknown as SyncTableGraphQlContinuation, shouldDeferBy);
      }

      const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
      const payload = {
        query: queryMetafieldDefinitions,
        variables: {
          ownerType: resourceMetafieldsSyncTableDefinition.metafieldOwnerType,
          maxEntriesPerRun,
          cursor: prevContinuation?.cursor ?? null,
        } as GetMetafieldDefinitionsQueryVariables,
      };

      const { response, continuation } = await makeSyncTableGraphQlRequest(
        {
          payload,
          maxEntriesPerRun,
          prevContinuation,
          getPageInfo: (data: any) => data.metafieldDefinitions?.pageInfo,
        },
        context
      );

      let items: any[];
      if (response?.body?.data?.metafieldDefinitions?.nodes) {
        items = response.body.data.metafieldDefinitions.nodes.map((node: MetafieldDefinitionFragment) =>
          formatMetafieldDefinitionForSchemaFromGraphQlApi(node, context)
        );
      }

      return {
        result: items,
        continuation: continuation,
      };
    },
    // maxUpdateBatchSize: 10,
    // executeUpdate: async function (params, updates, context) {
    //   const graphQlResource = context.sync.dynamicUrl as SupportedGraphQlResourceWithMetafields;
    //   const resourceMetafieldsSyncTableDefinition = requireResourceMetafieldsSyncTableDefinition(graphQlResource);
    //   const isRestUpdate = [GraphQlResource.Article, GraphQlResource.Page, GraphQlResource.Blog].includes(
    //     graphQlResource
    //   );

    //   // MetafieldDefinitionFragment is included in each GraphQL mutation response, not in Rest
    //   let metafieldDefinitions: MetafieldDefinitionFragment[];
    //   if (isRestUpdate) {
    //     metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl(
    //       { ownerType: resourceMetafieldsSyncTableDefinition.metafieldOwnerType },
    //       context
    //     );
    //   }

    //   const jobs = updates.map(async (update) => {
    //     // 'type' and 'owner_id' are required for the update to work
    //     if (update.previousValue.owner_id === undefined || update.previousValue.type === undefined) {
    //       throw new coda.UserVisibleError(
    //         'You need to have both `Type` and `Owner Id` columns in your table for the update to work'
    //       );
    //     }
    //     const { updatedFields } = update;
    //     const { type, owner_id } = update.previousValue;

    //     // We use rawValue as default, but if any helper edit column is set and has matching type, we use its value
    //     let value = update.newValue.rawValue as string;
    //     metafieldSyncTableHelperEditColumns.forEach((item) => {
    //       if (updatedFields.includes(item.key)) {
    //         if (type === item.type) {
    //           value = formatMetafieldValueForApi(update.newValue[item.key], type);
    //         } else {
    //           const goodColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === type);
    //           let errorMsg = `Metafield type mismatch. You tried to update using an helper column that doesn't match the metafield type.`;
    //           if (goodColumn) {
    //             errorMsg += ` The correct column for type '${type}' is: '${goodColumn.key}'.`;
    //           } else {
    //             errorMsg += ` You can only update this metafield by directly editing the 'Raw Value' column.`;
    //           }
    //           throw new coda.UserVisibleError(errorMsg);
    //         }
    //       }
    //     });

    //     let deletedMetafields: DeletedMetafieldsByKeysRest[];
    //     let updatedMetafields: MetafieldRest[] | MetafieldFragmentWithDefinition[];
    //     const fullKey = update.previousValue.label as string;
    //     const metafieldKeyValueSet: CodaMetafieldKeyValueSet = {
    //       key: fullKey,
    //       value: shouldDeleteMetafield(value) ? null : (value as any),
    //       type,
    //     };

    //     if (isRestUpdate) {
    //       const restResource = getRestResourceFromGraphQlResourceType(resourceMetafieldsSyncTableDefinition.key);
    //       ({ deletedMetafields, updatedMetafields } = await updateResourceMetafieldsRest(
    //         owner_id,
    //         restResource,
    //         [metafieldKeyValueSet],
    //         context
    //       ));
    //     } else {
    //       const ownerGid = idToGraphQlGid(resourceMetafieldsSyncTableDefinition.key, owner_id);
    //       ({ deletedMetafields, updatedMetafields } = await updateResourceMetafieldsGraphQl(
    //         ownerGid,
    //         [metafieldKeyValueSet],
    //         context
    //       ));
    //     }

    //     if (updatedMetafields.length) {
    //       const isGraphQlMetafields = updatedMetafields.every(
    //         (m) => m.hasOwnProperty('__typename') && m.__typename === GraphQlResource.Metafield
    //       );

    //       if (isGraphQlMetafields) {
    //         const updatedMetafield = updatedMetafields[0] as MetafieldFragmentWithDefinition;
    //         const ownerGid = idToGraphQlGid(resourceMetafieldsSyncTableDefinition.key, owner_id);
    //         return {
    //           ...update.previousValue,
    //           ...formatMetafieldForSchemaFromGraphQlApi(
    //             updatedMetafield,
    //             ownerGid,
    //             undefined,
    //             resourceMetafieldsSyncTableDefinition,
    //             context
    //           ),
    //         };
    //       } else {
    //         const updatedMetafield = updatedMetafields[0] as MetafieldRest;
    //         return {
    //           ...update.previousValue,
    //           ...formatMetafieldForSchemaFromGraphQlApi(
    //             normalizeRestMetafieldResponseToGraphQLResponse(updatedMetafield, metafieldDefinitions),
    //             idToGraphQlGid(graphQlResource, updatedMetafield.owner_id),
    //             undefined,
    //             resourceMetafieldsSyncTableDefinition,
    //             context
    //           ),
    //         };
    //       }
    //     } else if (deletedMetafields.length) {
    //       let deletedObj = { ...update.previousValue };
    //       Object.keys(deletedObj)
    //         // we keep these keys so that we can later recreate the metafield without having to use a button
    //         .filter((key) => !['id', 'label', 'owner_id', 'type', 'owner'].includes(key))
    //         .forEach((key) => {
    //           delete deletedObj[key];
    //         });
    //       return deletedObj;
    //     }
    //   });
    //   const completed = await Promise.allSettled(jobs);
    //   return {
    //     result: completed.map((job) => {
    //       if (job.status === 'fulfilled') return job.value;
    //       else return job.reason;
    //     }),
    //   };
    // },
  },
});
// #endregion

// #region Actions

// #endregion

// #region Formulas
export const Formula_MetafieldDefinition = coda.makeFormula({
  name: 'MetafieldDefinition',
  description: 'Get a single metafield definition by its ID.',
  connectionRequirement: coda.ConnectionRequirement.Required,
  parameters: [parameters.inputMetafieldDefinitionID],
  resultType: coda.ValueType.Object,
  schema: MetafieldDefinitionSchema,
  cacheTtlSecs: CACHE_DEFAULT,
  execute: async function ([metafieldDefinitionID], context) {
    const metafieldDefinitionNode = await fetchSingleMetafieldDefinitionGraphQl(
      idToGraphQlGid(GraphQlResource.MetafieldDefinition, metafieldDefinitionID),
      context
    );

    if (metafieldDefinitionNode) {
      return formatMetafieldDefinitionForSchemaFromGraphQlApi(metafieldDefinitionNode, context);
    }
  },
});

export const Format_MetafieldDefinition: coda.Format = {
  name: 'MetafieldDefinition',
  instructions: 'Paste the ID of the metafield definition into the column.',
  formulaName: 'MetafieldDefinition',
};

// #endregion
