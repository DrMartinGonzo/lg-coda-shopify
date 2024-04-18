import * as coda from '@codahq/packs-sdk';

import { ProductVariantReference } from './ProductVariantSchema';
import { OrderReference } from './OrderSchema';
import { OrderLineItemSchema as OrderLineItemBasicSchema } from '../basic/OrderLineItemSchema';
import { PACK_IDENTITIES } from '../../constants';

export const OrderLineItemSyncTableSchema = coda.makeObjectSchema({
  properties: {
    ...OrderLineItemBasicSchema.properties,
    order_id: {
      type: coda.ValueType.Number,
      fromKey: 'order_id',
      fixedId: 'order_id',
      useThousandsSeparator: false,
      description: 'The associated order ID.',
    },
    order: {
      ...OrderReference,
      fromKey: 'order',
      fixedId: 'order',
      description: 'A relation to the associated order.',
    },
    variant: {
      ...ProductVariantReference,
      fixedId: 'variant',
      description: 'The product variant',
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      fixedId: 'graphql_gid',
      description: 'The GraphQL GID for the Line Item.',
    },
  },
  displayProperty: 'name',
  idProperty: 'id',
  featuredProperties: [
    'order',
    'name',
    'sku',
    'variant',
    'quantity',
    'fulfillable_quantity',
    'fulfillment_status',
    'price',
    'properties',
  ],
});

const OrderLineItemReference = coda.makeReferenceSchemaFromObjectSchema(
  OrderLineItemSyncTableSchema,
  PACK_IDENTITIES.OrderLineItem
);
