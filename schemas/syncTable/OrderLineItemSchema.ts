import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { PACK_IDENTITIES } from '../../constants';
import { OrderLineItemSchema as OrderLineItemBasicSchema } from '../basic/OrderLineItemSchema';
import { OrderReference } from './OrderSchema';
import { ProductVariantReference } from './ProductVariantSchema';

export const OrderLineItemSyncTableSchema = coda.makeObjectSchema({
  properties: {
    ...OrderLineItemBasicSchema.properties,
    order_id: {
      ...PROPS.ID_NUMBER,
      fromKey: 'order_id',
      fixedId: 'order_id',
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
    graphql_gid: PROPS.makeGraphQlGidProp('order line item'),
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
