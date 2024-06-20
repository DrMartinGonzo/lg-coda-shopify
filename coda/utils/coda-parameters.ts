// #region Imports
import * as coda from '@codahq/packs-sdk';
import { graphQlGidToId, idToGraphQlGid } from '../../graphql/utils/graphql-utils';

import {
  GRAPHQL_NODES_LIMIT,
  LocationClient,
  MetafieldDefinitionClient,
  MetaobjectClient,
  MetaobjectDefinitionClient,
  ProductClient,
} from '../../Clients/GraphQlClients';
import { BlogClient, ListBlogsArgs, REST_DEFAULT_LIMIT } from '../../Clients/RestClients';
import { DEFAULT_THUMBNAIL_SIZE } from '../../config';
import {
  OPTIONS_COMMENTABLE,
  OPTIONS_COUNTRY_NAMES,
  OPTIONS_DRAFT_ORDER_STATUS,
  OPTIONS_METAOBJECT_STATUS,
  OPTIONS_ORDER_FINANCIAL_STATUS,
  OPTIONS_ORDER_FULFILLMENT_STATUS,
  OPTIONS_ORDER_STATUS,
  OPTIONS_PRODUCT_STATUS_GRAPHQL,
  OPTIONS_PUBLISHED_STATUS,
} from '../../constants/options-constants';
import {
  GraphQlFileTypesNames,
  GraphQlResourceNames,
  RestResourceSingular,
} from '../../constants/resourceNames-constants';
import { FULL_SIZE } from '../../constants/strings-constants';
import { getTemplateSuffixesFor } from '../../models/rest/AssetModel';
import { getMetaFieldFullKey } from '../../models/utils/metafields-utils';
import {
  getAllSupportDefinitionMetafieldSyncTables,
  getSupportedMetafieldSyncTables,
} from '../../sync/SupportedMetafieldSyncTable';
import { CurrencyCode, MetafieldOwnerType, TranslatableResourceType } from '../../types/admin.types';
import { compareByDisplayKey, formatOptionNameId } from '../../utils/helpers';
import {
  dimensionUnitsToLabelMap,
  volumeUnitsToLabelMap,
  weightUnitsToLabelMap,
} from '../../models/utils/measurements-utils';

// #endregion

export function createOrUpdateMetafieldDescription(actionName: 'update' | 'create', name: string) {
  return `List of ${name} metafields to ${actionName}. Use \`FormatMetafield\` or \`FormatListMetafield\` formulas.`;
}

function makeTemplateSuffixParameter(kind: RestResourceSingular) {
  return coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'templateSuffix',
    autocomplete: makeAutocompleteTemplateSuffixesFor(kind),
    description: `The suffix of the Liquid template used for the ${kind}. If this property is null, then the ${kind} uses the default template.`,
  });
}

// #region Autocomplete
async function autocompleteBlogIdParameter(context: coda.ExecutionContext, search: string, args: any) {
  const params: ListBlogsArgs = {
    limit: REST_DEFAULT_LIMIT,
    fields: ['id', 'title'].join(','),
  };
  const response = await BlogClient.createInstance(context).list(params);
  return coda.autocompleteSearchObjects(search, response?.body, 'title', 'id');
}

async function autocompleteBlogParameterWithName(context: coda.ExecutionContext, search: string, args: any) {
  const params: ListBlogsArgs = {
    limit: REST_DEFAULT_LIMIT,
    fields: ['id', 'title'].join(','),
  };
  const response = await BlogClient.createInstance(context).list(params);
  return response?.body.map((blog) => formatOptionNameId(blog.title, blog.id));
}

async function autocompleteLocationsWithName(context: coda.ExecutionContext, search: string): Promise<Array<string>> {
  const response = await LocationClient.createInstance(context).list({
    limit: GRAPHQL_NODES_LIMIT,
    fields: {
      fulfillment_service: false,
      local_pickup_settings: false,
      metafields: false,
    },
    options: {},
  });

  return response.body.map((location) => formatOptionNameId(location.name, graphQlGidToId(location.id)));
}

function makeAutocompleteMetafieldNameKeysWithDefinitions(ownerType: MetafieldOwnerType) {
  return async function (context: coda.ExecutionContext, search: string, args: any) {
    const defsData = await MetafieldDefinitionClient.createInstance(context).listForOwner({ ownerType });
    const searchObjects = defsData.map((m) => ({ name: m.name, fullKey: getMetaFieldFullKey(m) }));
    return coda.autocompleteSearchObjects(search, searchObjects, 'name', 'fullKey');
  };
}

export function autoCompleteMetafieldOwnerTypes() {
  return getSupportedMetafieldSyncTables()
    .map((r) => ({ display: r.display, value: r.ownerType }))
    .sort(compareByDisplayKey);
}

export function autoCompleteMetafieldWithDefinitionOwnerTypes() {
  return getAllSupportDefinitionMetafieldSyncTables()
    .map((r) => ({ display: r.display, value: r.ownerType }))
    .sort(compareByDisplayKey);
}

function makeAutocompleteMetafieldKeysWithDefinitions(ownerType: MetafieldOwnerType) {
  return async function (context: coda.ExecutionContext, search: string, args: any) {
    const defsData = await MetafieldDefinitionClient.createInstance(context).listForOwner({ ownerType });
    const keys = defsData.map((m) => getMetaFieldFullKey(m)).sort();
    return coda.simpleAutocomplete(search, keys);
  };
}
async function autoCompleteMetafieldWithDefinitionFullKeys(
  context: coda.ExecutionContext,
  search: string,
  formulaContext: coda.MetadataContext
) {
  // can be the dynamic url of a metafields sync table or formulaContext.ownerType
  const metafieldOwnerType = (context.sync?.dynamicUrl as MetafieldOwnerType) || formulaContext.ownerType;
  if (metafieldOwnerType === undefined) {
    return [];
  }
  return makeAutocompleteMetafieldKeysWithDefinitions(metafieldOwnerType)(context, search, {});
}

export async function autocompleteMetaobjectFieldkeyFromMetaobjectId(
  context: coda.ExecutionContext,
  search: string,
  args: any
) {
  if (!args.metaobjectId || args.metaobjectId === '') {
    throw new coda.UserVisibleError('You need to provide the ID of the metaobject first for autocomplete to work.');
  }

  const response = await MetaobjectClient.createInstance(context).single({
    id: idToGraphQlGid(GraphQlResourceNames.Metaobject, args.metaobjectId),
    fields: { definition: true, fieldDefinitions: true },
  });

  const fieldDefinitions = response?.body?.definition?.fieldDefinitions ?? [];
  return coda.autocompleteSearchObjects(search, fieldDefinitions, 'name', 'key');
}

export async function autocompleteMetaobjectFieldkeyFromMetaobjectType(
  context: coda.ExecutionContext,
  search: string,
  args: any
) {
  if (!args.type || args.type === '') {
    throw new coda.UserVisibleError('You need to define the type of the metaobject first for autocomplete to work.');
  }

  const response = await MetaobjectDefinitionClient.createInstance(context).singleByType({
    type: args.type,
    fields: { fieldDefinitions: true },
  });
  const fieldDefinitions = response?.body?.fieldDefinitions ?? [];
  return coda.autocompleteSearchObjects(search, fieldDefinitions, 'name', 'key');
}

export async function autocompleteMetaobjectType(context: coda.ExecutionContext, search: string, args: any) {
  const metaobjectDefinitionsData = await MetaobjectDefinitionClient.createInstance(context).listAllLoop({});
  return coda.autocompleteSearchObjects(search, metaobjectDefinitionsData, 'name', 'type');
}

async function autocompleteProductTypes(context: coda.ExecutionContext, search: string) {
  const productTypes = await ProductClient.createInstance(context).productTypes({});
  return coda.simpleAutocomplete(search, productTypes);
}

function makeAutocompleteTemplateSuffixesFor(kind: RestResourceSingular) {
  return async function (context: coda.ExecutionContext, search: string, args: any) {
    return getTemplateSuffixesFor({ kind, context });
  };
}
// #endregion

/**====================================================================================================================
 *    Inputs
 *===================================================================================================================== */
// #region General Inputs
const generalInputs = {
  author: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'author',
    description: 'The name of the author.',
  }),
  bodyHtml: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'bodyHtml',
    description: 'The text of the body of the item, complete with HTML markup.',
  }),
  emailBcc: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'bcc',
    description:
      'The list of email addresses to include in the `bcc` field of the email. Emails must be associated with staff accounts on the shop.',
  }),
  emailFrom: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'from',
    description: 'The email address that will populate the `from` field of the email.',
  }),
  emailMessage: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'message',
    description: 'The custom message displayed in the email.',
  }),
  emailSubject: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'subject',
    description: 'The email subject.',
  }),
  emailTo: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'to',
    description: 'The email address that will populate the `to` field of the email.',
  }),
  handle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'handle',
    description: "A human-friendly unique string for the item. Automatically generated from the item's title if blank.",
  }),
  id: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'id',
    description: 'The ID of the item.',
  }),
  imageUrl: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'imageUrl',
    description: 'Source URL that specifies the location of the image.',
  }),
  imageUrlArray: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'imageUrls',
    description: 'A comma-separated list of image urls for the item. ',
  }),
  imageAlt: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'imageAlt',
    description: 'Alternative text that describes the image.',
  }),
  metafieldValue: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'value',
    description:
      'Use `FormatMetafield` formula for a single metafield value or `FormatListMetafield` formula for a list of metafield values.',
  }),
  metafields: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'metafields',
    description: 'Metafields to update.',
  }),
  name: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'name',
    description: 'The name.',
  }),
  phone: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'phone',
    description: 'The phone number (E.164 format).',
  }),
  /** previewSize is a string because it can be a number or `FULL_SIZE`. */
  previewSize: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'previewSize',
    suggestedValue: `${DEFAULT_THUMBNAIL_SIZE}`,
    autocomplete: ['32', '48', `${DEFAULT_THUMBNAIL_SIZE}`, '128', '256', FULL_SIZE],
    description:
      'Maximum width (in pixels) of the preview image. Smaller values can increase display performance of the table if you have lots of entries.',
  }),
  published: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'published',
    description: 'Whether the item is visible.',
  }),
  publishedAt: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'publishedAt',
    description: 'When the item was published.',
  }),
  tagsArray: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'tags',
    description:
      'A comma-separated list of tags. Tags are additional short descriptors formatted as a string of comma-separated values.',
  }),
  title: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'The title of the item.',
  }),
  varArgsPropValue: coda.makeParameter({
    type: coda.ParameterType.String,
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
  summaryHtml: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'summaryHtml',
    description:
      'A summary of the article, which can include HTML markup. The summary is used by the online store theme to display the article on other pages, such as the home page or the main blog page.',
  }),
  templateSuffix: makeTemplateSuffixParameter('article'),
};
// #endregion

// #region Blog Inputs
const blogInputs = {
  commentable: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'commentable',
    description: 'Whether readers can post comments to the blog and if comments are moderated or not.',
    autocomplete: OPTIONS_COMMENTABLE,
  }),
  id: {
    ...generalInputs.id,
    name: 'blogId',
    description: 'The ID of the blog.',
  },
  idOptionName: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'blogId',
    description: 'The ID of the blog.',
    autocomplete: autocompleteBlogParameterWithName,
  }),
  templateSuffix: makeTemplateSuffixParameter('blog'),
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
  templateSuffix: makeTemplateSuffixParameter('collection'),
};
// #endregion

// #region Customer Inputs
const customerInputs = {
  acceptsEmailMarketing: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'acceptsEmailMarketing',
    description: 'Wether the customer consents to receiving marketing material by email.',
  }),
  acceptsSmsMarketing: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'acceptsSmsMarketing',
    description: 'Wether the customer consents to receiving marketing material by SMS.',
  }),
  email: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'email',
    description:
      'The unique email address of the customer. Attempting to assign the same email address to multiple customers returns an error.',
  }),
  id: {
    ...generalInputs.id,
    name: 'customerId',
    description: 'The ID of the customer.',
  },
  firstName: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'firstName',
    description: "The customer's first name.",
  }),
  lastName: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'lastName',
    description: "The customer's last name.",
  }),
  note: coda.makeParameter({
    type: coda.ParameterType.String,
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
  paymentGatewayId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'paymentGatewayId',
    description: 'The payment gateway ID.',
  }),
  paymentPending: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'paymentPending',
    description:
      '`true`: The resulting order will be unpaid and can be captured later.\n`false`: The resulting order will be marked as paid through either the default or specified gateway.',
  }),
};
// #endregion

// #region File Inputs
const fileInputs = {
  gid: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fileGid',
    description: 'The GraphQl GID of the file.',
  }),
};
// #endregion

// #region InventoryItem Inputs
const inventoryItemInputs = {
  cost: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'cost',
    description: "Unit cost associated with the inventory item, the currency is the shop's default currency.",
  }),
  id: {
    ...generalInputs.id,
    name: 'inventoryItemId',
    description: 'The ID of the Inventory Item.',
  },
  harmonizedSystemCode: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'harmonizedSystemCode',
    description: 'The harmonized system code of the inventory item. This must be a number between 6 and 13 digits.',
  }),
  tracked: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'tracked',
    description: "Whether the inventory item is tracked. The value must be true to adjust the item's inventory levels.",
  }),
};
// #endregion

// #region InventoryLevel Inputs
const InventoryLevelInputs = {
  available: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'available',
    description: 'Sets the available inventory quantity.',
  }),
  availableAdjustment: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'availableAdjustment',
    description:
      'The amount to adjust the available inventory quantity. Send negative values to subtract from the current available quantity.',
  }),
};
// #endregion

// #region Location Inputs
const locationInputs = {
  address1: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'address1',
    description: 'The street address.',
  }),
  address2: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'address2',
    description: 'The optional second line of the street address.',
  }),
  city: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'city',
    description: 'The city.',
  }),
  countryCode: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'countryCode',
    autocomplete: OPTIONS_COUNTRY_NAMES,
    description: 'The two-letter code (ISO 3166-1 alpha-2 format) corresponding to the country.',
  }),
  deactivateDestinationId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'destinationLocationId',
    description:
      'The ID of a destination location to which inventory, pending orders and moving transfers will be moved from the location to deactivate.',
  }),
  id: {
    ...generalInputs.id,
    name: 'locationId',
    description: 'The ID of the location.',
  },
  idOptionName: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'locationId',
    description: 'The ID of the location.',
    autocomplete: autocompleteLocationsWithName,
  }),
  name: {
    ...generalInputs.name,
    description: 'The name of the location.',
  },
  provinceCode: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'provinceCode',
    description: 'The province, state, or district code (ISO 3166-2 alpha-2 format).',
  }),
  zip: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'zip',
    description: 'The zip or postal code.',
  }),
};
// #endregion

// #region Metafield Inputs
const metafieldInputs = {
  fullKeyAutocomplete: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fullKey',
    description:
      'The full key of the metafield. That is, the key prefixed with the namespace and separated by a dot. e.g. "namespace.key". If ownerType is completed and valid, you will get autocomplete suggestions, but only for metafields having a definition. Use `Show formula` button to enter a metafield key that doesn\'t have a definition.',
    autocomplete: autoCompleteMetafieldWithDefinitionFullKeys,
  }),
  fullKey: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fullKey',
    description:
      'The full key of the metafield. That is, the key prefixed with the namespace and separated by a dot. e.g. "namespace.key".',
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
  ownerType: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'ownerType',
    description: 'The type of resource owning the metafield.',
    autocomplete: autoCompleteMetafieldOwnerTypes(),
  }),
  value: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'value',
    description:
      'A metafield value formatted with one of the `Meta{…}` helper formulas. Setting it to an empty string will delete the metafield if it already exists.',
  }),

  boolean: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'value',
    description: 'A boolean value.',
  }),
  currencyCode: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'currencyCode',
    description: 'The three-letter currency code supported by Shopify.',
    autocomplete: Object.values(CurrencyCode),
  }),
  number: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'value',
    description: 'A number value.',
  }),
  string: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'text',
    description: 'A string value.',
  }),
  referenceId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'id',
    description: 'The ID of the referenced resource.',
  }),
  scaleMin: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'scaleMin',
    description: 'The minimum value of the rating scale.',
  }),
  scaleMax: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'scaleMax',
    description: 'The maximum value of the rating scale.',
  }),
  date: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'date',
    description: 'A date value.',
  }),
  dimensionUnitGraphQl: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'unit',
    description: 'The dimension unit supported by Shopify.',
    autocomplete: Object.keys(dimensionUnitsToLabelMap),
  }),
  volumeUnitGraphQl: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'unit',
    description: 'The volume unit supported by Shopify.',
    autocomplete: Object.keys(volumeUnitsToLabelMap),
  }),
  weightUnitGraphQl: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'unit',
    description: 'The weight unit supported by Shopify.',
    autocomplete: Object.keys(weightUnitsToLabelMap),
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
  ownerType: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'ownerType',
    description: 'The type of resource owning the metafield.',
    autocomplete: autoCompleteMetafieldWithDefinitionOwnerTypes(),
  }),
};
// #endregion

// #region Metaobject Inputs
const metaobjectInputs = {
  handle: {
    ...generalInputs.handle,
    description: 'The handle of the metaobject.',
  },
  id: {
    ...generalInputs.id,
    name: 'metaobjectId',
    description: 'The ID of the metaobject.',
  },
  status: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'status',
    autocomplete: OPTIONS_METAOBJECT_STATUS,
    description: 'The status of the metaobject.',
  }),
  varArgsPropValue: {
    ...generalInputs.varArgsPropValue,
    description:
      'The property value. You can use one of the `Meta{…}` helper formulas or directly input the expected value.',
  },
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
  templateSuffix: makeTemplateSuffixParameter('page'),
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
  options: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'options',
    description:
      'A comma-separated list of up to 3 options for how this product can vary. Options are things like "Size" or "Color".',
  }),
  status: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'status',
    autocomplete: OPTIONS_PRODUCT_STATUS_GRAPHQL,
    description: 'The status of the product.',
  }),
  templateSuffix: makeTemplateSuffixParameter('product'),
  title: {
    ...generalInputs.title,
    description: 'The name of the product.',
  },
  vendor: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'vendor',
    description: 'The product vendor.',
  }),
};
// #endregion

// #region ProductVariant Inputs
const productVariantInputs = {
  barcode: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'barcode',
    description: 'The barcode, UPC, or ISBN number for the product variant',
  }),
  compareAtPrice: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'compareAtPrice',
    description: 'The original price of the item before an adjustment or a sale.',
  }),
  id: {
    ...generalInputs.id,
    name: 'productVariantId',
    description: 'The ID of the product variant.',
  },
  option1: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'option1',
    description: 'Option 1 of 3 of the product variant.',
  }),
  option2: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'option2',
    description: 'Option 2 of 3 of the product variant.',
  }),
  option3: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'option3',
    description: 'Option 3 of 3 of the product variant.',
  }),
  price: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'price',
    description: 'The product variant price.',
  }),
  position: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'position',
    description: 'The order of the product variant in the list of product variants.',
  }),
  sku: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'sku',
    description: 'The product variant sku.',
  }),
  taxable: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'taxable',
    description: 'Whether a tax is charged when the product variant is sold.',
  }),
  weight: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'weight',
    description:
      "The weight of the product variant in the unit system specified with weightUnit. If you don't specify a value for weightUnit, then the shop's default unit of measurement is applied",
  }),
  weightUnit: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'weightUnit',
    autocomplete: Object.values(weightUnitsToLabelMap),
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
  path: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'path',
    description:
      'The old path to be redirected. When the user visits this path, they will be redirected to the target. (maximum: 1024 characters).',
  }),
  target: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'target',
    description:
      "The target location where the user will be redirected. When the user visits the old path specified by the path property, they will be redirected to this location. This property can be set to any path on the shop's site, or to an external URL. (maximum: 255 characters)",
  }),
};
// #endregion

// #region ProductVariant Inputs
const translationInputs = {
  id: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'translationId',
    description: 'The ID of the translation. In the format of {resourceId}?key={key}&locale={locale}.',
  }),
  key: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'key',
    description: 'The key of the item to translate',
  }),
  locale: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'locale',
    description: 'The locale. (ex: `en`, `fr`, `es`…)',
  }),
  resourceId: {
    ...generalInputs.id,
    name: 'resourceId',
    description: 'The ID of the translated resource.',
  },
  resourceType: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'resourceType',
    description: 'The type of the translated resource.',
    autocomplete: Object.values(TranslatableResourceType),
  }),
};
// #endregion

/**====================================================================================================================
 *    Filters
 *===================================================================================================================== */
// #region General Filters
const generalFilters = {
  createdAtRange: coda.makeParameter({
    type: coda.ParameterType.DateArray,
    name: 'createdAt',
    description: 'Filter results created in the given date range.',
  }),
  fields: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fields',
    description: 'Comma-separated list of fields to retrieve. Retrieve all fields if blank.',
  }),
  handle: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'handle',
    description: 'Filter results by handle.',
  }),
  handleArray: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'handles',
    description: 'Filter results by comma separated list of handles.',
  }),
  id: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'id',
    description: 'Filter results by a single ID.',
  }),
  idArray: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'ids',
    description: 'Filter results by comma-separated list of IDs.',
  }),
  publishedAtRange: coda.makeParameter({
    type: coda.ParameterType.DateArray,
    name: 'publishedAt',
    description: 'Filter results published in the given date range.',
  }),
  processedAtRange: coda.makeParameter({
    type: coda.ParameterType.DateArray,
    name: 'processedAt',
    description: 'Filter results processed in the given date range.',
  }),
  publishedStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'publishedStatus',
    description: 'Filter results by their published status.',
    autocomplete: OPTIONS_PUBLISHED_STATUS,
  }),
  sinceId: coda.makeParameter({
    type: coda.ParameterType.Number,
    name: 'sinceId',
    description: 'Filter results created after the specified ID.',
  }),
  syncMetafields: coda.makeParameter({
    type: coda.ParameterType.Boolean,
    name: 'syncMetafields',
    description: 'Also retrieve metafields\n(only for metafields with a definition, can slow down the sync)',
  }),
  tagsString: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'tags',
    description: 'Filter items with a specific tag.',
  }),
  tagsArray: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'tags',
    description: 'Filter items by a comma-separated list of tags.',
  }),
  title: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'title',
    description: 'Filter results by specified title.',
  }),
  updatedAtRange: coda.makeParameter({
    type: coda.ParameterType.DateArray,
    name: 'updatedAt',
    description: 'Filter results updated in the given date range.',
  }),
  updatedAtMin: coda.makeParameter({
    type: coda.ParameterType.Date,
    name: 'updatedAtMin',
    description: 'Filter results last updated after this date.',
  }),
};
// #endregion

// #region Article Filters
const articleFilters = {
  author: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'author',
    description: 'Filter results by specified author.',
  }),
};
// #endregion

// #region Blog Filters
const blogFilters = {
  idOptionNameArray: coda.makeParameter({
    type: coda.ParameterType.StringArray,
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
  tags: {
    ...generalFilters.tagsArray,
    name: 'tags',
    description: 'Filter results by comma-separated list of Customer tags.',
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
  status: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'status',
    autocomplete: OPTIONS_DRAFT_ORDER_STATUS,
    suggestedValue: 'open',
    description: 'Filter results by draft order status.',
  }),
};
// #endregion

// #region File Filters
const fileFilters = {
  fileType: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fileType',
    autocomplete: GraphQlFileTypesNames,
    suggestedValue: GraphQlResourceNames.GenericFile,
    description: 'The type of file.',
  }),
};
// #endregion

// #region Location Filters
const locationFilters = {
  idOptionNameArray: coda.makeParameter({
    // BUG: Should be NumberArray but it doesn't seem to work…
    // @see topic: https://community.coda.io/t/ui-and-typescript-bug-with-with-coda-parametertype-numberarray/46455
    type: coda.ParameterType.StringArray,
    name: 'locationIds',
    description: 'Filter results by comma-separated list of Location IDs.',
    autocomplete: autocompleteLocationsWithName,
  }),
};
// #endregion

// #region Metafield Filters
const metafieldFilters = {
  metafieldKeys: coda.makeParameter({
    type: coda.ParameterType.StringArray,
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
  financialStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'financialStatus',
    autocomplete: OPTIONS_ORDER_FINANCIAL_STATUS,
    suggestedValue: 'any',
    description: 'Filter results by order financial status.',
  }),
  fulfillmentStatus: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'fulfillmentStatus',
    autocomplete: OPTIONS_ORDER_FULFILLMENT_STATUS,
    suggestedValue: 'any',
    description: 'Filter results by order fulfillment status.',
  }),
  status: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'status',
    autocomplete: OPTIONS_ORDER_STATUS,
    suggestedValue: 'open',
    description: 'Filter results by order status.',
  }),
  tags: {
    ...generalFilters.tagsArray,
    name: 'tags',
    description: 'Filter results by comma-separated list of Order tags.',
  },
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
  collectionId: {
    ...generalFilters.id,
    name: 'collectionId',
    description: 'Filter results by product collection ID.',
  },
  idArray: {
    ...generalFilters.idArray,
    name: 'productIds',
    description: 'Filter results by a comma-separated list of product IDs.',
  },
  productType: coda.makeParameter({
    type: coda.ParameterType.String,
    name: 'productType',
    autocomplete: autocompleteProductTypes,
    description: 'Filter results by product type.',
  }),
  productTypesArray: coda.makeParameter({
    type: coda.ParameterType.StringArray,
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
  // status: {
  //   ...productInputs.status,
  //   description: 'Filter results by the status of the product.',
  // },
  statusArray: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'status',
    autocomplete: OPTIONS_PRODUCT_STATUS_GRAPHQL,
    description: 'Filter results by the status of the product. Lave empty for all.',
  }),
  tagsArray: {
    ...generalFilters.tagsArray,
    description: 'Filter results by comma-separated list of product tags.',
  },
  vendor: {
    ...productInputs.vendor,
    description: 'Filter results by product vendor.',
  },
  vendorsArray: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'vendors',
    description: 'Filter results by comma-separated list of product vendors.',
  }),
};
// #endregion

// #region ProductVariant Filters
const productVariantFilters = {
  skuArray: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'skus',
    description: 'Filter results by skus.',
  }),
  options: coda.makeParameter({
    type: coda.ParameterType.StringArray,
    name: 'options',
    description: 'Filter results by comma-separated list of option values.',
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

// #region Inputs: Shop
const shopFilters = {
  // shopField: coda.makeParameter({
  //   type: coda.ParameterType.String,
  //   name: 'field',
  //   autocomplete: validShopFields,
  //   description: 'The Shop field to return',
  // }),
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
  metaobject: metaobjectInputs,
  order: orderInputs,
  page: pageInputs,
  product: productInputs,
  productVariant: productVariantInputs,
  redirect: redirectInputs,
  translation: translationInputs,
};

export const filters = {
  general: generalFilters,

  article: articleFilters,
  blog: blogFilters,
  collection: collectionFilters,
  customer: customerFilters,
  draftOrder: draftOrderFilters,
  file: fileFilters,
  location: locationFilters,
  metafield: metafieldFilters,
  order: orderFilters,
  product: productFilters,
  productVariant: productVariantFilters,
  redirect: redirectFilters,
  shop: shopFilters,
};
