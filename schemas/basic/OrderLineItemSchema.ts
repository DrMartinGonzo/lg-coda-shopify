import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { TaxLineSchema } from '../basic/TaxLineSchema';
import {
  inventoryItemRequiresShippingProp,
  itemGramsProp,
  itemSkuProp,
  itemTaxableProp,
} from '../syncTable/ProductVariantSchema';
import { AttributedStaffSchema } from './AttributedStaffSchema';
import { DiscountAllocationSchema } from './DiscountAllocationSchema';
import { DutySchema } from './DutySchema';
import { NameValueSchema } from './NameValueSchema';

export const orderLineItemTaxLinesProp = {
  type: coda.ValueType.Array,
  items: TaxLineSchema,
  fixedId: 'tax_lines',
  fromKey: 'tax_lines',
  description: 'A list of tax line objects, each of which details a tax applicable to the order.',
} as coda.ArraySchema<typeof TaxLineSchema> & coda.ObjectSchemaProperty;
export const orderLineItemDutiesProp = {
  type: coda.ValueType.Array,
  items: DutySchema,
  fixedId: 'duties',
  fromKey: 'duties',
  description: 'A list of duty objects, each containing information about a duty on the line item.',
} as coda.ArraySchema<typeof DutySchema> & coda.ObjectSchemaProperty;

// TODO: support applied_discount ?
export const OrderLineItemSchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('line item'),
    attributed_staffs: {
      type: coda.ValueType.Array,
      items: AttributedStaffSchema,
      fromKey: 'attributed_staffs',
      fixedId: 'attributed_staffs',
      description: 'The staff members attributed to the line item.',
    },
    //* Only exists in draft orders
    custom: {
      type: coda.ValueType.Boolean,
      fixedId: 'custom',
      fromKey: 'custom',
      description: 'Whether this is a custom line item or a product variant line item.',
    },
    fulfillable_quantity: {
      type: coda.ValueType.Number,
      fixedId: 'fulfillable_quantity',
      fromKey: 'fulfillable_quantity',
      description:
        'The amount available to fulfill, calculated as follows\nquantity - max(refunded_quantity, fulfilled_quantity) - pending_fulfilled_quantity - open_fulfilled_quantity',
    },
    fulfillment_service: {
      type: coda.ValueType.String,
      fixedId: 'fulfillment_service',
      fromKey: 'fulfillment_service',
      description: 'The handle of a fulfillment service that stocks the product variant belonging to a line item.',
    },
    fulfillment_status: {
      type: coda.ValueType.String,
      fixedId: 'fulfillment_status',
      fromKey: 'fulfillment_status',
      description: `How far along an order is in terms of line items fulfilled. Valid values:
- null
- fulfilled
- partial
- not_eligible`,
    },
    grams: itemGramsProp,
    price: {
      ...PROPS.CURRENCY,
      fixedId: 'price',
      fromKey: 'price',
      description: 'The price of the item before discounts have been applied in the shop currency.',
    },
    product_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'product_id',
      fromKey: 'product_id',
      description:
        'The ID of the product that the line item belongs to. Can be null if the original product associated with the order is deleted at a later date',
    },
    quantity: {
      type: coda.ValueType.Number,
      fixedId: 'quantity',
      fromKey: 'quantity',
      description: 'The number of items that were purchased.',
    },
    requires_shipping: inventoryItemRequiresShippingProp,
    sku: itemSkuProp,
    product_title: PROPS.makeTitleProp('product'),
    variant_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'variant_id',
      fromKey: 'variant_id',
      description: 'The ID of the product variant',
    },
    variant_title: PROPS.makeTitleProp('product variant', 'variant_title', 'variant_title'),
    vendor: {
      type: coda.ValueType.String,
      fixedId: 'vendor',
      fromKey: 'vendor',
      description: "The name of the item's supplier",
    },
    name: {
      type: coda.ValueType.String,
      fixedId: 'name',
      fromKey: 'name',
      required: true,
      description: 'The name of the product variant',
    },
    gift_card: {
      type: coda.ValueType.Boolean,
      fixedId: 'gift_card',
      fromKey: 'gift_card',
      description:
        'Whether the item is a gift card. If true, then the item is not taxed or considered for shipping charges.',
    },
    properties: {
      type: coda.ValueType.Array,
      items: NameValueSchema,
      fixedId: 'properties',
      fromKey: 'properties',
      description:
        'An array of custom information for the item that has been added to the cart. Often used to provide product customization options.',
    },
    taxable: { ...itemTaxableProp, description: 'Whether the item was taxable' },
    tax_lines: orderLineItemTaxLinesProp,
    tip_payment_gateway: {
      type: coda.ValueType.String,
      fixedId: 'tip_payment_gateway',
      fromKey: 'tip_payment_gateway',
      description: 'The payment gateway used to tender the tip, such as shopify_payments. Present only on tips.',
    },
    tip_payment_method: {
      type: coda.ValueType.String,
      fixedId: 'tip_payment_method',
      fromKey: 'tip_payment_method',
      description: 'The payment method used to tender the tip, such as Visa. Present only on tips.',
    },
    total_discount: {
      ...PROPS.CURRENCY,
      fixedId: 'total_discount',
      fromKey: 'total_discount',
      description:
        'The total amount of the discount allocated to the line item in the shop currency. This field must be explicitly set using draft orders, Shopify scripts, or the API. Instead of using this field, Shopify recommends using discount_allocations, which provides the same information.',
    },
    discount_allocations: {
      type: coda.ValueType.Array,
      items: DiscountAllocationSchema,
      fixedId: 'discount_allocations',
      fromKey: 'discount_allocations',
      description:
        'An ordered list of amounts allocated by discount applications. Each discount allocation is associated with a particular discount application.',
    },
    duties: {
      type: coda.ValueType.Array,
      items: DutySchema,
      fixedId: 'duties',
      fromKey: 'duties',
      description: 'A list of duty objects, each containing information about a duty on the line item.',
    },

    product_exists: {
      type: coda.ValueType.Boolean,
      fixedId: 'product_exists',
      fromKey: 'product_exists',
      description: 'Whether the product associated with the line item exists.',
    },
    variant_inventory_management: {
      type: coda.ValueType.String,
      fixedId: 'variant_inventory_management',
      fromKey: 'variant_inventory_management',
      description: `The fulfillment service that tracks the number of items in stock for the product variant. Valid values:
 - shopify: You are tracking inventory yourself using the admin.
 - null: You aren't tracking inventory on the variant.
 - the handle of a fulfillment service that has inventory management enabled: This must be the same fulfillment service referenced by the fulfillment_service property.`,
    },
  },
  displayProperty: 'name',
});
