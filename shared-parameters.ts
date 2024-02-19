import * as coda from '@codahq/packs-sdk';

import {
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
  OPTIONS_PRODUCT_STATUS_REST,
  OPTIONS_PUBLISHED_STATUS,
} from './constants';
import { autocompleteProductTypes } from './products/products-functions';
import { autocompleteLocationsWithName } from './locations/locations-functions';
import { countryCodes } from './types/misc';

export const sharedParameters = {
  optionalSyncMetafields: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'syncMetafields',
    description: 'Also retrieve metafields (slower sync)',
    optional: true,
  }),

  inventoryItemID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'inventoryItemID',
    description: 'The ID of the Inventory Item.',
  }),

  locationID: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'locationID',
    description: 'The ID of the location.',
  }),
  location: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'location',
    description: 'The location.',
    autocomplete: autocompleteLocationsWithName,
  }),

  metafieldValue: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'metafieldValue',
    description: 'The metafield value.',
  }),

  orderStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'status',
    autocomplete: OPTIONS_ORDER_STATUS,
    suggestedValue: 'open',
    description: 'Filter orders by their status.',
  }),

  productId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'productId',
    description: 'The Id of the product.',
  }),
  productType: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'productType',
    description: 'The product type.',
    autocomplete: autocompleteProductTypes,
  }),
  productTypes: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'productTypes',
    description: 'Filter results by product types.',
    autocomplete: autocompleteProductTypes,
  }),
  productVendor: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'vendor',
    description: 'The product vendor.',
  }),
  productVendors: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'vendors',
    description: 'Return products by product vendors.',
  }),
  productStatusRest: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'status',
    description: 'The status of the product.',
    autocomplete: OPTIONS_PRODUCT_STATUS_REST,
  }),
  productSingleStatusRest: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'status',
    description: 'The status of the product.',
    autocomplete: OPTIONS_PRODUCT_STATUS_REST,
  }),
  productPublishedStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'publishedStatus',
    description: 'The product published status.',
    autocomplete: OPTIONS_PUBLISHED_STATUS,
  }),
  productIds: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'productIds',
    description: 'Return only products specified by a comma-separated list of product IDs or GraphQL GIDs.',
  }),
  metafields: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'metafields',
    description: 'Metafields to update.',
  }),

  // TODO: We will need multiple InputFormat formulas to help format values for the user
  varArgsPropValue: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'value',
    description: 'The property value.',
  }),

  /**====================================================================================================================
   *    Inputs
   *===================================================================================================================== */
  inputAcceptsEmailMarketing: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'acceptsEmailMarketing',
    description: 'Wether the customer consents to receiving marketing material by email.',
  }),
  inputAcceptsSmsMarketing: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'acceptsSmsMarketing',
    description: 'Wether the customer consents to receiving marketing material by SMS.',
  }),
  inputAddress1: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'address1',
    description: 'The street address.',
  }),
  inputAddress2: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'address2',
    description: 'The optional second line of the street address.',
  }),
  inputAuthor: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'author',
    description: 'The name of the author.',
  }),
  inputBodyHtml: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'bodyHtml',
    description: 'The text of the body of the item, complete with HTML markup.',
  }),
  inputCity: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'city',
    description: 'The city.',
  }),
  inputCountryCode: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'countryCode',
    autocomplete: countryCodes,
    description: 'The two-letter code (ISO 3166-1 alpha-2 format) corresponding to the country.',
  }),
  inputEmail: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'email',
    description: 'The unique email address of the person.',
  }),
  inputFirstName: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'firstName',
    description: "The person's first name.",
  }),
  inputHandle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'handle',
    description:
      "A human-friendly unique string for the item that's automatically generated from the item's title. The handle is used in the item's URL.",
  }),
  inputImageUrl: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'imageUrl',
    description: 'Source URL that specifies the location of the image.',
  }),
  inputImageAlt: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'imageAlt',
    description: 'Alternative text that describes the image.',
  }),
  inputLastName: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'lastName',
    description: "The person's last name.",
  }),
  inputName: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'name',
    description: 'The name.',
  }),
  inputNote: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'note',
    description: 'A note.',
  }),
  inputPhone: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'phone',
    description: 'The phone number (E.164 format).',
  }),
  inputProvinceCode: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'provinceCode',
    description: 'The province, state, or district code (ISO 3166-2 alpha-2 format).',
  }),
  inputPublished: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'published',
    description: 'Whether the item is visible.',
  }),
  inputPublishedAt: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'publishedAt',
    description: 'When the item was published.',
  }),
  inputTags: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'tags',
    description:
      'A comma-separated list of tags. Tags are additional short descriptors formatted as a string of comma-separated values.',
  }),
  inputTitle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'The title of the item.',
  }),
  inputZip: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'zip',
    description: 'The zip or postal code.',
  }),

  /**====================================================================================================================
   *    Filters
   *===================================================================================================================== */
  filterCreatedAtRange: coda.makeParameter({
    type: coda.ParameterType.DateArray,
    name: 'createdAt',
    description: 'Filter results created in the given date range.',
  }),
  filterPublishedAtRange: coda.makeParameter({
    type: coda.ParameterType.DateArray,
    name: 'publishedAt',
    description: 'Filter results published in the given date range.',
  }),
  filterProcessedAtRange: coda.makeParameter({
    type: coda.ParameterType.DateArray,
    name: 'processedAt',
    description: 'Filter results processed in the given date range.',
  }),
  filterUpdatedAtRange: coda.makeParameter({
    type: coda.ParameterType.DateArray,
    name: 'updatedAt',
    description: 'Filter results updated in the given date range.',
  }),
  filterUpdatedAtMin: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'updatedAtMin',
    description: 'Filter results last updated after this date.',
  }),

  filterFields: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fields',
    description: 'Comma-separated list of fields names to retrieve. Retrieve all fields if blank.',
  }),
  filterFinancialStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'financialStatus',
    autocomplete: OPTIONS_ORDER_FINANCIAL_STATUS,
    suggestedValue: 'any',
    optional: true,
    description: 'Filter results by their financial status.',
  }),
  filterFulfillmentStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fulfillmentStatus',
    autocomplete: OPTIONS_ORDER_FULFILLMENT_STATUS,
    suggestedValue: 'any',
    description: 'Filter results by their fulfillment status.',
  }),
  filterHandle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'handle',
    description: 'Filter results by handle.',
  }),
  filterHandles: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'handles',
    description: 'Filter results by comma separated list of handles.',
  }),
  filterIds: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'ids',
    description: 'Filter results by comma-separated list of IDs.',
  }),
  filterLocations: coda.makeParameter({
    // BUG: Should be NumberArray but it doesn't seem to work…
    // @see topic: https://community.coda.io/t/ui-and-typescript-bug-with-with-coda-parametertype-numberarray/46455
    type: coda.ParameterType.StringArray,
    name: 'locations',
    description: 'Filter results by locations.',
    autocomplete: autocompleteLocationsWithName,
  }),
  filterProductId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'productId',
    description: 'Filter results that include the specified product.',
  }),

  filterPublishedStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'publishedStatus',
    description: 'Filter results by the published status.',
    autocomplete: OPTIONS_PUBLISHED_STATUS,
  }),
  filterSinceId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'sinceId',
    description: 'Filter results created after the specified ID.',
  }),
  filterAuthor: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'author',
    description: 'Filter results by specified author.',
  }),
  filterTitle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'Filter results by specified title.',
  }),
  filterSkus: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'skus',
    description: 'Filter results by skus.',
  }),
};
