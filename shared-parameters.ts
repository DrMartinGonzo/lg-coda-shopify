import { makeParameter, ParameterType } from '@codahq/packs-sdk';

import {
  countryNameAutocompleteValues,
  DEFAULT_THUMBNAIL_SIZE,
  OPTIONS_DRAFT_ORDER_STATUS,
  OPTIONS_METAOBJECT_STATUS,
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
  OPTIONS_PRODUCT_STATUS_REST,
  OPTIONS_PUBLISHED_STATUS,
} from './constants';
import { getUnitMap, weightUnitsMap } from './helpers';
import { autocompleteBlogParameterWithName } from './blogs/blogs-functions';
import { autocompleteLocationsWithName } from './locations/locations-functions';
import { RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS } from './metafields/metafields-constants';
import { autoCompleteMetafieldWithDefinitionFullKeys } from './metafields/metafields-functions';
import { autocompleteProductTypes } from './products/products-functions';
import { makeAutocompleteTemplateSuffixesFor } from './themes/themes-functions';
import { COMMENTABLE_OPTIONS } from './schemas/syncTable/BlogSchema';

/**====================================================================================================================
 *    Inputs
 *===================================================================================================================== */
// #region General Inputs
const generalInputs = {
  author: makeParameter({
    type: ParameterType.String,
    name: 'author',
    description: 'The name of the author.',
  }),
  bodyHtml: makeParameter({
    type: ParameterType.String,
    name: 'bodyHtml',
    description: 'The text of the body of the item, complete with HTML markup.',
  }),
  handle: makeParameter({
    type: ParameterType.String,
    name: 'handle',
    description: "A human-friendly unique string for the item. Automatically generated from the item's title if blank.",
  }),
  id: makeParameter({
    type: ParameterType.Number,
    name: 'id',
    description: 'The ID of the item.',
  }),
  imageUrl: makeParameter({
    type: ParameterType.String,
    name: 'imageUrl',
    description: 'Source URL that specifies the location of the image.',
  }),
  imageUrlArray: makeParameter({
    type: ParameterType.StringArray,
    name: 'imageUrls',
    description: 'A comma-separated list of image urls for the item. ',
  }),
  imageAlt: makeParameter({
    type: ParameterType.String,
    name: 'imageAlt',
    description: 'Alternative text that describes the image.',
  }),
  metafields: makeParameter({
    type: ParameterType.StringArray,
    name: 'metafields',
    description: 'Metafields to update.',
  }),
  name: makeParameter({
    type: ParameterType.String,
    name: 'name',
    description: 'The name.',
  }),
  phone: makeParameter({
    type: ParameterType.String,
    name: 'phone',
    description: 'The phone number (E.164 format).',
  }),
  published: makeParameter({
    type: ParameterType.Boolean,
    name: 'published',
    description: 'Whether the item is visible.',
  }),
  publishedAt: makeParameter({
    type: ParameterType.Date,
    name: 'publishedAt',
    description: 'When the item was published.',
  }),
  tagsArray: makeParameter({
    type: ParameterType.StringArray,
    name: 'tags',
    description:
      'A comma-separated list of tags. Tags are additional short descriptors formatted as a string of comma-separated values.',
  }),
  previewSize: makeParameter({
    type: ParameterType.Number,
    name: 'previewSize',
    suggestedValue: DEFAULT_THUMBNAIL_SIZE,
    description:
      'The maximum width of the thumbnail. Smaller values can increase display performance of the table if you have lots of entries.',
  }),
  title: makeParameter({
    type: ParameterType.String,
    name: 'title',
    description: 'The title of the item.',
  }),
  varArgsPropValue: makeParameter({
    type: ParameterType.String,
    name: 'value',
    description: 'The property value.',
  }),
};
// #endregion

// #region Article Inputs
const articleInputs = {
  bodyHtml: {
    ...generalInputs.bodyHtml,
    description: 'The text content of the article, complete with HTML markup.',
  },
  id: {
    ...generalInputs.id,
    name: 'articleId',
    description: 'The ID of the article.',
  },
  summaryHtml: makeParameter({
    type: ParameterType.String,
    name: 'summaryHtml',
    description:
      'A summary of the article, which can include HTML markup. The summary is used by the online store theme to display the article on other pages, such as the home page or the main blog page.',
  }),
  templateSuffix: makeParameter({
    type: ParameterType.String,
    name: 'templateSuffix',
    autocomplete: makeAutocompleteTemplateSuffixesFor('article'),
    description:
      'The suffix of the Liquid template used for the article. If this property is null, then the article uses the default template.',
  }),
};
// #endregion

// #region Blog Inputs
const blogInputs = {
  commentable: makeParameter({
    type: ParameterType.String,
    name: 'commentable',
    description: 'Whether readers can post comments to the blog and if comments are moderated or not.',
    autocomplete: COMMENTABLE_OPTIONS,
  }),
  id: {
    ...generalInputs.id,
    name: 'blogId',
    description: 'The ID of the blog.',
  },
  idOptionName: makeParameter({
    type: ParameterType.String,
    name: 'blogId',
    description: 'The ID of the blog.',
    autocomplete: autocompleteBlogParameterWithName,
  }),
  templateSuffix: makeParameter({
    type: ParameterType.String,
    name: 'templateSuffix',
    autocomplete: makeAutocompleteTemplateSuffixesFor('blog'),
    description:
      'The suffix of the Liquid template used for the blog. If this property is null, then the blog uses the default template.',
  }),
};
// #endregion

// #region Collection Inputs
const collectionInputs = {
  bodyHtml: {
    ...generalInputs.bodyHtml,
    description: 'A description of the collection, complete with HTML markup.',
  },
  id: {
    ...generalInputs.id,
    name: 'collectionId',
    description: 'The ID of the collection.',
  },
  templateSuffix: makeParameter({
    type: ParameterType.String,
    name: 'templateSuffix',
    autocomplete: makeAutocompleteTemplateSuffixesFor('collection'),
    description:
      'The suffix of the Liquid template used for the collection. If this property is null, then the collection uses the default template.',
  }),
};
// #endregion

// #region Customer Inputs
const customerInputs = {
  acceptsEmailMarketing: makeParameter({
    type: ParameterType.Boolean,
    name: 'acceptsEmailMarketing',
    description: 'Wether the customer consents to receiving marketing material by email.',
  }),
  acceptsSmsMarketing: makeParameter({
    type: ParameterType.Boolean,
    name: 'acceptsSmsMarketing',
    description: 'Wether the customer consents to receiving marketing material by SMS.',
  }),
  email: makeParameter({
    type: ParameterType.String,
    name: 'email',
    description:
      'The unique email address of the customer. Attempting to assign the same email address to multiple customers returns an error.',
  }),
  id: {
    ...generalInputs.id,
    name: 'customerId',
    description: 'The ID of the customer.',
  },
  firstName: makeParameter({
    type: ParameterType.String,
    name: 'firstName',
    description: "The customer's first name.",
  }),
  lastName: makeParameter({
    type: ParameterType.String,
    name: 'lastName',
    description: "The customer's last name.",
  }),
  note: makeParameter({
    type: ParameterType.String,
    name: 'note',
    description: 'A note about the customer.',
  }),
};
// #endregion

// #region DraftOrder Inputs
const draftOrderInputs = {
  id: {
    ...generalInputs.id,
    name: 'draftOrderId',
    description: 'The ID of the draft order.',
  },
};
// #endregion

// #region File Inputs
const fileInputs = {
  gid: makeParameter({
    type: ParameterType.String,
    name: 'fileGid',
    description: 'The GraphQl GID of the file.',
  }),
};
// #endregion

// #region InventoryItem Inputs
const inventoryItemInputs = {
  cost: makeParameter({
    type: ParameterType.Number,
    name: 'cost',
    description: "Unit cost associated with the inventory item, the currency is the shop's default currency.",
  }),
  id: {
    ...generalInputs.id,
    name: 'inventoryItemId',
    description: 'The ID of the Inventory Item.',
  },
  harmonizedSystemCode: makeParameter({
    type: ParameterType.String,
    name: 'harmonizedSystemCode',
    description: 'The harmonized system code of the inventory item. This must be a number between 6 and 13 digits.',
  }),
  tracked: makeParameter({
    type: ParameterType.Boolean,
    name: 'tracked',
    description: "Whether the inventory item is tracked. The value must be true to adjust the item's inventory levels.",
  }),
};
// #endregion

// #region InventoryLevel Inputs
const InventoryLevelInputs = {
  available: makeParameter({
    type: ParameterType.Number,
    name: 'available',
    description: 'Sets the available inventory quantity.',
  }),
  availableAdjustment: makeParameter({
    type: ParameterType.Number,
    name: 'availableAdjustment',
    description:
      'The amount to adjust the available inventory quantity. Send negative values to subtract from the current available quantity.',
  }),
};
// #endregion

// #region Location Inputs
const locationInputs = {
  address1: makeParameter({
    type: ParameterType.String,
    name: 'address1',
    description: 'The street address.',
  }),
  address2: makeParameter({
    type: ParameterType.String,
    name: 'address2',
    description: 'The optional second line of the street address.',
  }),
  city: makeParameter({
    type: ParameterType.String,
    name: 'city',
    description: 'The city.',
  }),
  countryCode: makeParameter({
    type: ParameterType.String,
    name: 'countryCode',
    autocomplete: countryNameAutocompleteValues,
    description: 'The two-letter code (ISO 3166-1 alpha-2 format) corresponding to the country.',
  }),
  deactivateDestinationId: makeParameter({
    type: ParameterType.Number,
    name: 'destinationLocationId',
    description:
      'The ID of a destination location to which inventory, pending orders and moving transfers will be moved from the location to deactivate.',
  }),
  id: {
    ...generalInputs.id,
    name: 'locationId',
    description: 'The ID of the location.',
  },
  idOptionName: makeParameter({
    type: ParameterType.String,
    name: 'locationId',
    description: 'The ID of the location.',
    autocomplete: autocompleteLocationsWithName,
  }),
  name: {
    ...generalInputs.name,
    description: 'The name of the location.',
  },
  provinceCode: makeParameter({
    type: ParameterType.String,
    name: 'provinceCode',
    description: 'The province, state, or district code (ISO 3166-2 alpha-2 format).',
  }),
  zip: makeParameter({
    type: ParameterType.String,
    name: 'zip',
    description: 'The zip or postal code.',
  }),
};
// #endregion

// #region Metafield Inputs
const metafieldInputs = {
  fullKey: makeParameter({
    type: ParameterType.String,
    name: 'fullKey',
    description:
      'The full key of the metafield. That is, the key prefixed with the namespace and separated by a dot. e.g. "namespace.key". If ownerType is completed and valid, you will get autocomplete suggestions, but only for metafields having a definition. Use `Show formula` button to enter a metafield key that doesn\'t have a definition.',
    autocomplete: autoCompleteMetafieldWithDefinitionFullKeys,
  }),
  id: {
    ...generalInputs.id,
    name: 'metafieldId',
    description: 'The ID of the metafield.',
  },
  ownerID: {
    ...generalInputs.id,
    name: 'ownerId',
    description: 'The ID of the resource owning the metafield.',
  },
  ownerType: makeParameter({
    type: ParameterType.String,
    name: 'ownerType',
    description: 'The type of the resource owning the metafield.',
    autocomplete: RESOURCE_METAFIELDS_SYNC_TABLE_DEFINITIONS.map((v) => ({
      display: v.display,
      value: v.key,
    })),
  }),
  value: makeParameter({
    type: ParameterType.String,
    name: 'value',
    description:
      'A single metafield value written using one of the `Metafield{…}Value` formulas or a list of metafield values wrapped with the `MetafieldValues` formula. Setting it to an empty string will delete the metafield if it already exists.',
  }),

  boolean: makeParameter({
    type: ParameterType.Boolean,
    name: 'value',
    description: 'A boolean value.',
  }),
  number: makeParameter({
    type: ParameterType.Number,
    name: 'value',
    description: 'A number value.',
  }),
  string: makeParameter({
    type: ParameterType.String,
    name: 'text',
    description: 'A string value.',
  }),
  referenceId: makeParameter({
    type: ParameterType.Number,
    name: 'id',
    description: 'The ID of the referenced resource.',
  }),
  date: makeParameter({
    type: ParameterType.Date,
    name: 'date',
    description: 'A date value.',
  }),
  weightUnitGraphQl: makeParameter({
    type: ParameterType.String,
    name: 'unit',
    description: 'The weight unit supported by Shopify.',
    autocomplete: Object.keys(getUnitMap('weight')),
  }),
};
// #endregion

// #region MetafieldDefinition Inputs
const metafieldDefinitionInputs = {
  id: {
    ...generalInputs.id,
    name: 'metafieldDefinitionId',
    description: 'The ID of the metafield definition.',
  },
};
// #endregion

// #region MetafieldObject Inputs
const metafieldObjectInputs = {
  handle: {
    ...generalInputs.handle,
    description: 'The handle of the metaobject.',
  },
  id: {
    ...generalInputs.id,
    name: 'metaobjectId',
    description: 'The ID of the metaobject.',
  },
  status: makeParameter({
    type: ParameterType.String,
    name: 'status',
    autocomplete: OPTIONS_METAOBJECT_STATUS,
    description: 'The status of the metaobject.',
  }),
};
// #endregion

// #region Order Inputs
const orderInputs = {
  id: {
    ...generalInputs.id,
    name: 'orderID',
    description: 'The ID of the order.',
  },
};
// #endregion

// #region Page Inputs
const pageInputs = {
  bodyHtml: {
    ...generalInputs.bodyHtml,
    description: 'The text content of the page, complete with HTML markup.',
  },
  id: {
    ...generalInputs.id,
    name: 'pageId',
    description: 'The ID of the page.',
  },
  templateSuffix: makeParameter({
    type: ParameterType.String,
    name: 'templateSuffix',
    autocomplete: makeAutocompleteTemplateSuffixesFor('page'),
    description:
      'The suffix of the Liquid template used for the page. If this property is null, then the page uses the default template.',
  }),
};
// #endregion

// #region Product Inputs
const productInputs = {
  bodyHtml: {
    ...generalInputs.bodyHtml,
    description: 'The description of the product, complete with HTML markup.',
  },
  handle: {
    ...generalInputs.handle,
    description:
      "A unique human-friendly string for the product. If you update the handle, the old handle won't be redirected to the new one automatically.",
  },
  id: {
    ...generalInputs.id,
    name: 'productId',
    description: 'The ID of the product.',
  },
  imageUrls: {
    ...generalInputs.imageUrlArray,
    description: 'A comma-separated list of image urls for the product. ',
  },
  options: makeParameter({
    type: ParameterType.StringArray,
    name: 'options',
    description:
      'A comma-separated list of up to 3 options for how this product can vary. Options are things like "Size" or "Color".',
  }),
  status: makeParameter({
    type: ParameterType.String,
    name: 'status',
    autocomplete: OPTIONS_PRODUCT_STATUS_REST,
    description: 'The status of the product.',
  }),
  templateSuffix: makeParameter({
    type: ParameterType.String,
    name: 'templateSuffix',
    autocomplete: makeAutocompleteTemplateSuffixesFor('product'),
    description:
      'The suffix of the Liquid template used for the product page. If this property is null, then the product page uses the default template.',
  }),
  title: {
    ...generalInputs.title,
    description: 'The name of the product.',
  },
  vendor: makeParameter({
    type: ParameterType.String,
    name: 'vendor',
    description: 'The product vendor.',
  }),
};
// #endregion

// #region ProductVariant Inputs
const productVariantInputs = {
  barcode: makeParameter({
    type: ParameterType.String,
    name: 'barcode',
    description: 'The barcode, UPC, or ISBN number for the product variant',
  }),
  compareAtPrice: makeParameter({
    type: ParameterType.Number,
    name: 'compareAtPrice',
    description: 'The original price of the item before an adjustment or a sale.',
  }),
  id: {
    ...generalInputs.id,
    name: 'productVariantId',
    description: 'The ID of the product variant.',
  },
  option1: makeParameter({
    type: ParameterType.String,
    name: 'option1',
    description: 'Option 1 of 3 of the product variant.',
  }),
  option2: makeParameter({
    type: ParameterType.String,
    name: 'option2',
    description: 'Option 2 of 3 of the product variant.',
  }),
  option3: makeParameter({
    type: ParameterType.String,
    name: 'option3',
    description: 'Option 3 of 3 of the product variant.',
  }),
  price: makeParameter({
    type: ParameterType.Number,
    name: 'price',
    description: 'The product variant price.',
  }),
  position: makeParameter({
    type: ParameterType.Number,
    name: 'position',
    description: 'The order of the product variant in the list of product variants.',
  }),
  sku: makeParameter({
    type: ParameterType.String,
    name: 'sku',
    description: 'The product variant sku.',
  }),
  taxable: makeParameter({
    type: ParameterType.Boolean,
    name: 'taxable',
    description: 'Whether a tax is charged when the product variant is sold.',
  }),
  weight: makeParameter({
    type: ParameterType.Number,
    name: 'weight',
    description:
      "The weight of the product variant in the unit system specified with weightUnit. If you don't specify a value for weightUnit, then the shop's default unit of measurement is applied",
  }),
  weightUnit: makeParameter({
    type: ParameterType.String,
    name: 'weightUnit',
    autocomplete: Object.values(weightUnitsMap),
    description:
      "The unit of measurement that applies to the product variant's weight. If you don't specify a value for weight_unit, then the shop's default unit of measurement is applied.",
  }),
};
// #endregion

// #region Redirect Inputs
const redirectInputs = {
  id: {
    ...generalInputs.id,
    name: 'redirectId',
    description: 'The ID of the redirect.',
  },
  path: makeParameter({
    type: ParameterType.String,
    name: 'path',
    description:
      'The old path to be redirected. When the user visits this path, they will be redirected to the target. (maximum: 1024 characters).',
  }),
  target: makeParameter({
    type: ParameterType.String,
    name: 'target',
    description:
      "The target location where the user will be redirected. When the user visits the old path specified by the path property, they will be redirected to this location. This property can be set to any path on the shop's site, or to an external URL. (maximum: 255 characters)",
  }),
};
// #endregion

/**====================================================================================================================
 *    Filters
 *===================================================================================================================== */
// #region General Filters
const generalFilters = {
  createdAtRange: makeParameter({
    type: ParameterType.DateArray,
    name: 'createdAt',
    description: 'Filter results created in the given date range.',
  }),
  fields: makeParameter({
    type: ParameterType.String,
    name: 'fields',
    description: 'Comma-separated list of fields to retrieve. Retrieve all fields if blank.',
  }),
  handle: makeParameter({
    type: ParameterType.String,
    name: 'handle',
    description: 'Filter results by handle.',
  }),
  handleArray: makeParameter({
    type: ParameterType.StringArray,
    name: 'handles',
    description: 'Filter results by comma separated list of handles.',
  }),
  id: makeParameter({
    type: ParameterType.Number,
    name: 'id',
    description: 'Filter results by a single ID.',
  }),
  idArray: makeParameter({
    type: ParameterType.StringArray,
    name: 'ids',
    description: 'Filter results by comma-separated list of IDs.',
  }),
  publishedAtRange: makeParameter({
    type: ParameterType.DateArray,
    name: 'publishedAt',
    description: 'Filter results published in the given date range.',
  }),
  processedAtRange: makeParameter({
    type: ParameterType.DateArray,
    name: 'processedAt',
    description: 'Filter results processed in the given date range.',
  }),
  publishedStatus: makeParameter({
    type: ParameterType.String,
    name: 'publishedStatus',
    description: 'Filter results by their published status.',
    autocomplete: OPTIONS_PUBLISHED_STATUS,
  }),
  sinceId: makeParameter({
    type: ParameterType.Number,
    name: 'sinceId',
    description: 'Filter results created after the specified ID.',
  }),
  syncMetafields: makeParameter({
    type: ParameterType.Boolean,
    name: 'syncMetafields',
    description: 'Also retrieve metafields\n(only for metafields with a definition, can slow down the sync)',
  }),
  tagLOL: makeParameter({
    type: ParameterType.String,
    name: 'tags',
    description: 'Filter items with a specific tag.',
  }),
  tagsArray: makeParameter({
    type: ParameterType.StringArray,
    name: 'tags',
    description: 'Filter items by a comma-separated list of tags.',
  }),
  title: makeParameter({
    type: ParameterType.String,
    name: 'title',
    description: 'Filter results by specified title.',
  }),
  updatedAtRange: makeParameter({
    type: ParameterType.DateArray,
    name: 'updatedAt',
    description: 'Filter results updated in the given date range.',
  }),
  updatedAtMin: makeParameter({
    type: ParameterType.Date,
    name: 'updatedAtMin',
    description: 'Filter results last updated after this date.',
  }),
};
// #endregion

// #region Article Filters
const articleFilters = {
  author: makeParameter({
    type: ParameterType.String,
    name: 'author',
    description: 'Filter results by specified author.',
  }),
};
// #endregion

// #region Blog Filters
const blogFilters = {
  idOptionNameArray: makeParameter({
    type: ParameterType.StringArray,
    name: 'blogIds',
    description: 'Filter results by comma-separated list of Blog IDs.',
    autocomplete: autocompleteBlogParameterWithName,
  }),
};
// #endregion

// #region Collection Filters
const collectionFilters = {
  id: {
    ...generalFilters.id,
    name: 'collectionId',
    description: 'Filter results by a single collection ID.',
  },
  idArray: {
    ...generalFilters.idArray,
    name: 'collectionIds',
    description: 'Filter results by comma-separated list of Collection IDs.',
  },
};
// #endregion

// #region Customer Filters
const customerFilters = {
  idArray: {
    ...generalFilters.idArray,
    name: 'customerIds',
    description: 'Filter results by comma-separated list of Customer IDs.',
  },
};
// #endregion

// #region DraftOrder Filters
const draftOrderFilters = {
  idArray: {
    ...generalFilters.idArray,
    name: 'draftOrderIds',
    description: 'Filter results by comma-separated list of draft order IDs.',
  },
  status: makeParameter({
    type: ParameterType.String,
    name: 'status',
    autocomplete: OPTIONS_DRAFT_ORDER_STATUS,
    suggestedValue: 'open',
    description: 'Filter results by draft order status.',
  }),
};
// #endregion

// #region Location Filters
const locationFilters = {
  idOptionNameArray: makeParameter({
    // BUG: Should be NumberArray but it doesn't seem to work…
    // @see topic: https://community.coda.io/t/ui-and-typescript-bug-with-with-coda-parametertype-numberarray/46455
    type: ParameterType.StringArray,
    name: 'locationIds',
    description: 'Filter results by comma-separated list of Location IDs.',
    autocomplete: autocompleteLocationsWithName,
  }),
};
// #endregion

// #region Metafield Filters
const metafieldFilters = {
  metafieldKeys: makeParameter({
    type: ParameterType.StringArray,
    name: 'metafieldKeys',
    description:
      "Filter results by Metafield keys. In the format of <namespace.key>, separated by commas. For example: `coda.title, coda.content`. You will get autocomplete suggestions, but only for metafields having a definition. Use `Show formula` button to enter metafield keys that doesn't have a definition.",
    autocomplete: autoCompleteMetafieldWithDefinitionFullKeys,
  }),
};
// #endregion

// #region Order Filters
const orderFilters = {
  idArray: {
    ...generalFilters.idArray,
    name: 'orderIds',
    description: 'Filter results by comma-separated list of Order IDs.',
  },
  financialStatus: makeParameter({
    type: ParameterType.String,
    name: 'financialStatus',
    autocomplete: OPTIONS_ORDER_FINANCIAL_STATUS,
    suggestedValue: 'any',
    description: 'Filter results by order financial status.',
  }),
  fulfillmentStatus: makeParameter({
    type: ParameterType.String,
    name: 'fulfillmentStatus',
    autocomplete: OPTIONS_ORDER_FULFILLMENT_STATUS,
    suggestedValue: 'any',
    description: 'Filter results by order fulfillment status.',
  }),
  status: makeParameter({
    type: ParameterType.String,
    name: 'status',
    autocomplete: OPTIONS_ORDER_STATUS,
    suggestedValue: 'open',
    description: 'Filter results by order status.',
  }),
};
// #endregion

// #region Product Filters
const productFilters = {
  handleArray: {
    ...generalFilters.handleArray,
    description: 'Filter results by comma separated list of product handles.',
  },
  id: {
    ...generalFilters.id,
    name: 'productId',
    description: 'Filter results by product ID.',
  },
  idArray: {
    ...generalFilters.idArray,
    name: 'productIds',
    description: 'Filter results by a comma-separated list of product IDs.',
  },
  productType: makeParameter({
    type: ParameterType.String,
    name: 'productType',
    autocomplete: autocompleteProductTypes,
    description: 'Filter results by product type.',
  }),
  productTypesArray: makeParameter({
    type: ParameterType.StringArray,
    name: 'productTypes',
    description: 'Filter results by product types.',
    autocomplete: autocompleteProductTypes,
  }),
  publishedStatus: {
    ...generalFilters.publishedStatus,
    description: 'Filter results by the published status of the product.',
  },
  createdAtRange: {
    ...generalFilters.createdAtRange,
    description: 'Filter results for products created in the given date range.',
  },
  updatedAtRange: {
    ...generalFilters.updatedAtRange,
    description: 'Filter results for products updated in the given date range.',
  },
  publishedAtRange: {
    ...generalFilters.publishedAtRange,
    description: 'Filter results for products published in the given date range.',
  },
  status: {
    ...productInputs.status,
    description: 'Filter results by the status of the product.',
  },
  statusArray: makeParameter({
    type: ParameterType.StringArray,
    name: 'status',
    autocomplete: OPTIONS_PRODUCT_STATUS_REST,
    description: 'Filter results by the status of the product.',
  }),
  vendor: {
    ...productInputs.vendor,
    description: 'Filter results by product vendor.',
  },
};
// #endregion

// #region ProductVariant Filters
const productVariantFilters = {
  skuArray: makeParameter({
    type: ParameterType.StringArray,
    name: 'skus',
    description: 'Filter results by skus.',
  }),
};
// #endregion

// #region Inputs: Redirect
const redirectFilters = {
  path: {
    ...redirectInputs.path,
    description: 'Show redirects with a given path.',
  },
  target: {
    ...redirectInputs.target,
    description: 'Show redirects with a given target.',
  },
};
// #endregion
/**====================================================================================================================
 *    Exports
 *===================================================================================================================== */
export const inputs = {
  general: generalInputs,

  article: articleInputs,
  blog: blogInputs,
  collection: collectionInputs,
  customer: customerInputs,
  draftOrder: draftOrderInputs,
  file: fileInputs,
  inventoryItem: inventoryItemInputs,
  InventoryLevel: InventoryLevelInputs,
  location: locationInputs,
  metafield: metafieldInputs,
  metafieldDefinition: metafieldDefinitionInputs,
  metafieldObject: metafieldObjectInputs,
  order: orderInputs,
  page: pageInputs,
  product: productInputs,
  productVariant: productVariantInputs,
  redirect: redirectInputs,
};

export const filters = {
  general: generalFilters,

  article: articleFilters,
  blog: blogFilters,
  collection: collectionFilters,
  customer: customerFilters,
  draftOrder: draftOrderFilters,
  location: locationFilters,
  metafield: metafieldFilters,
  order: orderFilters,
  product: productFilters,
  productVariant: productVariantFilters,
  redirect: redirectFilters,
};
