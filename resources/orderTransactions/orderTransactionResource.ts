import { GraphQlResourceName } from '../ShopifyResource.types';
import { RestResourcePlural, RestResourceSingular } from '../ShopifyResource.types';
import { OrderTransactionRow } from '../../schemas/CodaRows.types';
import { OrderTransactionSyncTableSchema } from '../../schemas/syncTable/OrderTransactionSchema';
import { ResourceWithSchema } from '../Resource.types';

const orderTransactionResourceBase = {
  display: 'Order Transaction',
  schema: OrderTransactionSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.OrderTransaction,
    singular: 'transactions',
    plural: 'transactionss',
  },
  rest: {
    // TODO: fix this
    singular: RestResourceSingular.Order,
    // TODO: fix this
    plural: RestResourcePlural.Order,
  },
} as const;

export type OrderTransaction = ResourceWithSchema<
  typeof orderTransactionResourceBase,
  {
    codaRow: OrderTransactionRow;
  }
>;

export const orderTransactionResource = orderTransactionResourceBase as OrderTransaction;
