import * as coda from "@codahq/packs-sdk";

export const pack = coda.newPack();

const API_BASE_URL = "https://lydia-gautier.myshopify.com/admin/api";

/**====================================================================================================================
 *    Auth
 *===================================================================================================================== */
pack.setUserAuthentication({
  type: coda.AuthenticationType.Custom,
  params: [
    {
      name: 'token', 
      description: 'The account token'
    },
  ],
});
pack.addNetworkDomain("lydia-gautier.myshopify.com");

/**====================================================================================================================
 *    Schemas
 *===================================================================================================================== */
const ProductIdsCollectionSchema = coda.makeObjectSchema({
  properties: {
    product_id: {
      type: coda.ValueType.Number,
      required: true,
    },
    collection_id:  {
      type: coda.ValueType.Number,
      required: true,
    },
    unique_id:  {
      type: coda.ValueType.String,
      required: true,
    },
  },
  displayProperty: "collection_id",
  idProperty: "unique_id",
  featuredProperties: ["product_id"],
});

/**====================================================================================================================
 *    Fetch functions
 *===================================================================================================================== */
async function fetchProductIdsInCollection([id], context) {
  let invocationToken = context.invocationToken;
  let tokenPlaceholder = '{{token-' + invocationToken + '}}';
  let url = context.sync.continuation ?? `${API_BASE_URL}/2022-01/collections/${id}/products.json?limit=250`;

  const response = await context.fetcher.fetch({
    method: "GET",
    url: url,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': tokenPlaceholder
    },
  });

  const { body } = response;

  // Check if we have paginated results
  let nextUrl;
  const link = response.headers.link;
  if(link) {
    const parts = link.split(',')
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index];
      if(part.indexOf("next") !== -1) {
        nextUrl = part.split(";")[0].trim().slice(1, -1);
        break;
      }
    }
  }

  let items = [];
  if (body.products) {
    items =  body.products.map(product => {
      return {
        product_id: product.id,
        collection_id: id,
        unique_id: `${id}_${product.id}`
      };
    });
  }

  return {
    result: items,
    continuation: nextUrl,
  }
}

/**====================================================================================================================
 *    Sync tables
 *===================================================================================================================== */
pack.addSyncTable({
  name: "ProductIdsInCollection",
  description: "All product ids belonging to a specified collection id.",
  identityName: "ProductIdInCollection",
  schema: ProductIdsCollectionSchema,
  formula: {
    name: "SyncProductIdsInCollection",
    description: "<Help text for the sync formula, not show to the user>",
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.Number,
        name: "id",
        description: "The id of the collection.",
      }),
    ],
    execute: fetchProductIdsInCollection,
  },
});


