import * as coda from '@codahq/packs-sdk';

import { IDENTITY_ORDER_LINE_ITEM } from '../../constants';
import { ProductVariantReference } from './ProductVariantSchema';
import { OrderReference } from './OrderSchema';
import { OrderLineItemSchema as OrderLineItemBasicSchema } from '../basic/OrderLineItemSchema';

export const OrderLineItemSchema = coda.makeObjectSchema({
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

export const OrderLineItemReference = coda.makeReferenceSchemaFromObjectSchema(
  OrderLineItemSchema,
  IDENTITY_ORDER_LINE_ITEM
);
