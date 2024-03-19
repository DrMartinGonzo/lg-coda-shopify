import * as coda from '@codahq/packs-sdk';

import { SimpleRest } from '../../Fetchers/SimpleRest';
import { SyncTableParamValues, SyncTableRest } from '../../Fetchers/SyncTableRest';
import { cleanQueryParams } from '../../helpers-rest';
import { augmentSchemaWithMetafields } from '../../schemas/schema-helpers';
import { customerFieldDependencies } from '../../schemas/syncTable/CustomerSchema';
import { handleFieldDependencies } from '../../utils/helpers';
import { Customer, customerResource } from './customerResource';
import { Sync_Customers } from './customers-coda';

export class CustomerSyncTable extends SyncTableRest<Customer> {
  constructor(fetcher: SimpleRest<Customer>, params: coda.ParamValues<coda.ParamDefs>) {
    super(customerResource, fetcher, params);
  }

  static dynamicOptions: coda.DynamicOptions = {
    getSchema: async function (context: coda.ExecutionContext, _: string, formulaContext: coda.MetadataContext) {
      let { schema, metafields } = customerResource;
      let augmentedSchema = schema;
      if (formulaContext.syncMetafields) {
        augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, metafields.ownerType, context);
      }
      // @ts-ignore: admin_url should always be the last featured property, regardless of any metafield keys added previously
      augmentedSchema.featuredProperties.push('admin_url');
      return augmentedSchema;
    },
    defaultAddDynamicColumns: false,
  };

  setSyncParams() {
    const [syncMetafields, created_at, updated_at, ids] = this.codaParams as SyncTableParamValues<
      typeof Sync_Customers
    >;

    const syncedStandardFields = handleFieldDependencies(this.effectiveStandardFromKeys, customerFieldDependencies);
    this.syncParams = cleanQueryParams({
      fields: syncedStandardFields.join(', '),
      limit: this.restLimit,
      ids: ids && ids.length ? ids.join(',') : undefined,
      created_at_min: created_at ? created_at[0] : undefined,
      created_at_max: created_at ? created_at[1] : undefined,
      updated_at_min: updated_at ? updated_at[0] : undefined,
      updated_at_max: updated_at ? updated_at[1] : undefined,
    });
  }
}
