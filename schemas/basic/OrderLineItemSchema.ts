import * as coda from '@codahq/packs-sdk';

import { NameValueSchema } from './NameValueSchema';
import { DiscountAllocationSchema } from './DiscountAllocationSchema';
import { TaxLineSchema } from './TaxLineSchema';
import { DutySchema } from './DutySchema';
import { AttributedStaffSchema } from './AttributedStaffSchema';

export const OrderLineItemSchema = coda.makeObjectSchema({
  properties: {
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'id',
      useThousandsSeparator: false,
      required: true,
      description: 'The ID of the line item.',
    },
    attributed_staffs: {
      type: coda.ValueType.Array,
      items: AttributedStaffSchema,
      fromKey: 'attributed_staffs',
      fixedId: 'attributed_staffs',
      description: 'The staff members attributed to the line item.',
    },
    // Only exists in draft orders
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
      description:
        'How far along an order is in terms line items fulfilled. Valid values:\n- null\n- fulfilled\n- partial\n- not_eligible.',
    },
    grams: {
      type: coda.ValueType.Number,
      fixedId: 'grams',
      fromKey: 'grams',
      description: 'The weight of the item in grams.',
    },
    price: {
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
      fixedId: 'price',
      fromKey: 'price',
      description: 'The price of the item before discounts have been applied in the shop currency.',
    },
    product_id: {
      type: coda.ValueType.Number,
      fixedId: 'product_id',
      fromKey: 'product_id',
      useThousandsSeparator: false,
      description:
        'The ID of the product that the line item belongs to. Can be null if the original product associated with the order is deleted at a later date',
    },
    quantity: {
      type: coda.ValueType.Number,
      fixedId: 'quantity',
      fromKey: 'quantity',
      description: 'The number of items that were purchased.',
    },
    requires_shipping: {
      type: coda.ValueType.Boolean,
      fixedId: 'requires_shipping',
      fromKey: 'requires_shipping',
      description: 'Whether the item requires shipping.',
    },
    sku: {
      type: coda.ValueType.String,
      fixedId: 'sku',
      fromKey: 'sku',
      description: "The item's SKU (stock keeping unit).",
    },
    product_title: {
      type: coda.ValueType.String,
      fixedId: 'title',
      fromKey: 'title',
      description: 'The title of the product',
    },
    variant_id: {
      type: coda.ValueType.Number,
      fixedId: 'variant_id',
      fromKey: 'variant_id',
      useThousandsSeparator: false,
      description: 'The ID of the product variant',
    },
    variant_title: {
      type: coda.ValueType.String,
      fixedId: 'variant_title',
      fromKey: 'variant_title',
      description: 'The title of the product variant',
    },
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
    taxable: {
      type: coda.ValueType.Boolean,
      fixedId: 'taxable',
      fromKey: 'taxable',
      description: 'Whether the item was taxable',
    },
    tax_lines: {
      type: coda.ValueType.Array,
      items: TaxLineSchema,
      fixedId: 'tax_lines',
      fromKey: 'tax_lines',
      description: 'A list of tax line objects, each of which details a tax applied to the item.',
    },
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
      type: coda.ValueType.Number,
      codaType: coda.ValueHintType.Currency,
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
