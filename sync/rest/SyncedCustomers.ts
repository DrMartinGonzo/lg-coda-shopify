// #region Imports

import { ListCustomersArgs } from '../../Clients/RestClients';
import { GetSchemaArgs } from '../AbstractSyncedResources';
import { CodaSyncParams } from '../AbstractSyncedResources';
import { Sync_Customers } from '../../coda/setup/customers-setup';
import { CustomerModel } from '../../models/rest/CustomerModel';
import { FieldDependency } from '../../schemas/Schema.types';
import { augmentSchemaWithMetafields, updateCurrencyCodesInSchema } from '../../schemas/schema-utils';
import { CustomerSyncTableSchema } from '../../schemas/syncTable/CustomerSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { arrayUnique, dateRangeMax, dateRangeMin, deepCopy } from '../../utils/helpers';
import { AbstractSyncedRestResourcesWithGraphQlMetafields } from './AbstractSyncedRestResourcesWithGraphQlMetafields';

// #endregion

// #region Types
export type SyncCustomersParams = CodaSyncParams<typeof Sync_Customers>;
// #endregion

export class SyncedCustomers extends AbstractSyncedRestResourcesWithGraphQlMetafields<CustomerModel> {
  public static schemaDependencies: FieldDependency<typeof CustomerSyncTableSchema.properties>[] = [
    {
      field: 'id',
      dependencies: ['admin_url'],
    },
    {
      field: 'email_marketing_consent',
      dependencies: ['accepts_email_marketing'],
    },
    {
      field: 'sms_marketing_consent',
      dependencies: ['accepts_sms_marketing'],
    },
  ];

  public static staticSchema = CustomerSyncTableSchema;

  public static async getDynamicSchema({ codaSyncParams, context }: GetSchemaArgs) {
    const [syncMetafields] = codaSyncParams as SyncCustomersParams;
    let augmentedSchema = deepCopy(this.staticSchema);
    if (syncMetafields) {
      augmentedSchema = await augmentSchemaWithMetafields(augmentedSchema, MetafieldOwnerType.Customer, context);
    }

    augmentedSchema = await updateCurrencyCodesInSchema(augmentedSchema, context);

    // @ts-expect-error: admin_url should always be the last featured property, regardless of any metafield keys added previously
    augmentedSchema.featuredProperties.push('admin_url');
    return augmentedSchema;
  }

  public get codaParamsMap() {
    const [syncMetafields, createdAtRange, updatedAtRange, idArray, tags] = this.codaParams as SyncCustomersParams;
    return {
      syncMetafields,
      createdAtRange,
      updatedAtRange,
      idArray,
      tags,
    };
  }

  protected get syncedStandardFields(): string[] {
    // Add required fields needed for certain filters
    if (this.codaParamsMap.tags) return arrayUnique([...super.syncedStandardFields, 'tags']);
    return super.syncedStandardFields;
  }

  protected codaParamsToListArgs(): Omit<ListCustomersArgs, 'limit' | 'options'> {
    const { createdAtRange, idArray, tags, updatedAtRange } = this.codaParamsMap;
    return {
      fields: this.syncedStandardFields.join(','),
      ids: idArray && idArray.length ? idArray.join(',') : undefined,

      created_at_min: dateRangeMin(createdAtRange),
      created_at_max: dateRangeMax(createdAtRange),
      updated_at_min: dateRangeMin(updatedAtRange),
      updated_at_max: dateRangeMax(updatedAtRange),
      tags,
    };
  }
}
