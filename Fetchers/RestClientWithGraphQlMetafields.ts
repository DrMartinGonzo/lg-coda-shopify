import { idToGraphQlGid } from '../helpers-graphql';
import { CodaMetafieldKeyValueSet } from '../helpers-setup';
import { ResourceWithMetafields } from '../resources/Resource.types';
import { MetafieldGraphQlFetcher } from '../resources/metafields/MetafieldGraphQlFetcher';
import {
  getMetaFieldFullKey,
  preprendPrefixToMetaFieldKey,
  shouldUpdateSyncTableMetafieldValue,
} from '../resources/metafields/metafields-helpers';
import { formatMetaFieldValueForSchema } from '../schemas/schema-helpers';
import { RestClientWithMetafields } from './RestClientWithMetafields';

export abstract class RestClientWithGraphQlMetafields<
  ResourceT extends ResourceWithMetafields<any, any>
> extends RestClientWithMetafields<ResourceT> {
  // #region Requests

  // async handleUpdateJob(
  //   update: coda.SyncUpdate<string, string, ResourceT['schema']>,
  //   metafieldDefinitions: ResultOf<typeof metafieldDefinitionFragment>[] = []
  // ) {
  //   console.log('metafieldDefinitions', metafieldDefinitions);
  //   // TODO: extract this part to a helper
  //   const includedProperties = update.updatedFields.concat([
  //     getObjectSchemaEffectiveKey(this.schema, this.schema.idProperty),
  //   ]);
  //   const updatedRow = Object.fromEntries(
  //     Object.entries(update.newValue).filter(([key]) => includedProperties.includes(key))
  //   ) as ResourceT['codaRow'];
  //   // END TODO

  //   const result = await super.handleUpdateJob(update, metafieldDefinitions);

  //   const metafieldKeyValueSets = await getMetafieldKeyValueSetsFromUpdate(
  //     updatedRow,
  //     metafieldDefinitions,
  //     this.context
  //   );
  //   if (metafieldKeyValueSets.length) {
  //     const formattedMetafields = await this.updateAndFormatMetafields({ rowId: result.id, metafieldKeyValueSets });
  //     return {
  //       ...result,
  //       ...formattedMetafields,
  //     };
  //   }
  //   return result;
  // }

  // async handleUpdateJob(
  //   row: {
  //     original?: ResourceT['codaRow'];
  //     updated: ResourceT['codaRow'];
  //   },
  //   metafieldDefinitions: ResultOf<typeof metafieldDefinitionFragment>[] = []
  // ) {
  //   const updatedRow = row.updated;
  //   const mainResult = await super.handleUpdateJob(row);

  //   const metafieldKeyValueSets = await getMetafieldKeyValueSetsFromUpdate(
  //     updatedRow,
  //     metafieldDefinitions,
  //     this.context
  //   );
  //   if (metafieldKeyValueSets.length) {
  //     const formattedMetafields = await this.updateAndFormatMetafields({ rowId: mainResult.id, metafieldKeyValueSets });
  //     return {
  //       ...mainResult,
  //       ...formattedMetafields,
  //     };
  //   }
  //   return mainResult;
  // }

  // TODO: write description
  async updateAndFormatMetafields(params: {
    rowId: number;
    metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet>;
    /** Wether the data will be consumed by an action wich result use a `coda.withIdentity` schema. */
    schemaWithIdentity?: boolean;
  }): Promise<{ [key: string]: any }> {
    let obj = {};

    const ownerGid = idToGraphQlGid(this.resource.graphQl.name, params.rowId);
    const metafieldFetcher = new MetafieldGraphQlFetcher(this.resource, this.context);
    const { deletedMetafields, updatedMetafields } = await metafieldFetcher.createUpdateDelete(
      ownerGid,
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
          obj[matchingSchemaKey] = formatMetaFieldValueForSchema(metafield);
        }
      });
    }

    return obj;
  }

  // async updateWithMetafields(
  //   row: { original?: ResourceT['codaRow']; updated: ResourceT['codaRow'] },
  //   metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet> = []
  // ): Promise<ResourceT['codaRow']> {
  //   const result = await super.handleUpdateJob(row);
  //   if (metafieldKeyValueSets.length) {
  //     const formattedMetafields = await this.updateAndFormatMetafields({ rowId: result.id, metafieldKeyValueSets });
  //     return {
  //       ...result,
  //       ...formattedMetafields,
  //     };
  //   }
  //   return result;
  // }

  // #endregion
}
