import * as coda from '@codahq/packs-sdk';

import {
  createProductMetafield,
  deleteMetafield,
  fetchMetafield,
  fetchProductMetafields,
  updateProductMetafield,
} from './metafields-functions';

import { ProductMetafieldSchema } from './metafields-schema';
import { getTokenPlaceholder } from '../helpers';

export const setupMetafields = (pack) => {
  /**====================================================================================================================
   *    Formulas
   *===================================================================================================================== */
  // A formula to fetch a product metafields.
  pack.addFormula({
    name: 'ProductMetafields',
    description: 'Get product metafields data.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'productId',
        description: 'The id of the product.',
      }),
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Array,
    items: ProductMetafieldSchema,
    execute: fetchProductMetafields,
  });

  pack.addFormula({
    name: 'Metafield',
    description: 'Get a single metafield by its id.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
    ],
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Object,
    schema: ProductMetafieldSchema,
    execute: fetchMetafield,
  });

  pack.addFormula({
    name: 'DeleteMetafield',
    description: 'delete metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
    ],
    isAction: true,
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Boolean,
    execute: async ([metafieldId], context) => {
      const response = await deleteMetafield([metafieldId], context);
      return true;
    },
  });

  pack.addFormula({
    name: 'UpdateProductMetafield',
    description: 'update product metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'productId',
        description: 'The id of the product.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'metafieldId',
        description: 'The id of the metafield.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'The value of the metafield.',
      }),
    ],
    isAction: true,
    cacheTtlSecs: 0,
    resultType: coda.ValueType.Boolean,
    execute: async ([productId, metafieldId, value], context) => {
      const response = await updateProductMetafield([productId, metafieldId, value], context);
      return true;
    },
  });

  pack.addFormula({
    name: 'CreateProductMetafield',
    description: 'create product metafield.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'productId',
        description: 'The id of the product.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'namespace',
        description: 'The namespace of the metafield.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The key of the metafield.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'The value of the metafield.',
      }),
    ],
    isAction: true,
    cacheTtlSecs: 10,
    resultType: coda.ValueType.Number,
    execute: async ([productId, namespace, key, value], context) => {
      const response = await createProductMetafield([productId, namespace, key, value], context);
      const { body } = response;
      return body.metafield.id;
    },
  });

  pack.addFormula({
    name: 'CreateMetaObject',
    description: 'create metaobject.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'type',
        description: 'The type of the metaobject.',
      }),
    ],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The key of the field.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'the field value.',
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async ([type, ...varargs], context) => {
      const fields = [];
      while (varargs.length > 0) {
        let key: string, value: string;
        // Pull the first set of varargs off the list, and leave the rest.
        [key, value, ...varargs] = varargs;
        fields.push({ key, value });
      }

      const payload = {
        query: ` mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
                      metaobjectCreate(metaobject: $metaobject) {
                        metaobject {
                          id
                        }
                        userErrors {
                          field
                          message
                          code
                        }
                      }
                    }`,
        variables: {
          metaobject: {
            type: type,
            capabilities: {
              publishable: {
                status: 'ACTIVE',
              },
            },
            fields: fields,
          },
        },
      };
      const response = await context.fetcher.fetch({
        method: 'POST',
        url: `${context.endpoint}/admin/api/2023-04/graphql.json`,
        cacheTtlSecs: 0,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': getTokenPlaceholder(context),
        },
        body: JSON.stringify(payload),
      });

      const { body } = response;
      return body.data.metaobjectCreate.metaobject.id;
    },
  });

  pack.addFormula({
    name: 'UpdateMetaObject',
    description: 'update metaobject.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'id',
        description: 'The ud of the metaobject.',
      }),
    ],
    varargParameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'key',
        description: 'The key of the field.',
      }),
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'value',
        description: 'the field value.',
      }),
    ],
    isAction: true,
    resultType: coda.ValueType.String,
    execute: async ([id, ...varargs], context) => {
      const fields = [];
      while (varargs.length > 0) {
        let key: string, value: string;
        // Pull the first set of varargs off the list, and leave the rest.
        [key, value, ...varargs] = varargs;
        fields.push({ key, value });
      }

      const payload = {
        query: ` mutation metaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
                      metaobjectUpdate(id: $id, metaobject: $metaobject) {
                        metaobject {
                          id
                        }
                        userErrors {
                          field
                          message
                          code
                        }
                      }
                    }`,
        variables: {
          id: id,
          metaobject: {
            capabilities: {
              publishable: {
                status: 'ACTIVE',
              },
            },
            fields: fields,
          },
        },
      };
      const response = await context.fetcher.fetch({
        method: 'POST',
        url: `${context.endpoint}/admin/api/2023-04/graphql.json`,
        cacheTtlSecs: 0,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': getTokenPlaceholder(context),
        },
        body: JSON.stringify(payload),
      });

      const { body } = response;
      return body.data.metaobjectUpdate.metaobject.id;
    },
  });

  pack.addFormula({
    name: 'DeleteMetaObject',
    description: 'create metaobject.',
    parameters: [
      coda.makeParameter({
        type: coda.ParameterType.String,
        name: 'id',
        description: 'The id of the metaobject to delete.',
      }),
    ],

    isAction: true,
    resultType: coda.ValueType.String,
    execute: async ([id], context) => {
      const payload = {
        query: `mutation metaobjectDelete($id: ID!) {
                  metaobjectDelete(id: $id) {
                    deletedId
                    userErrors {
                      field
                      message
                    }
                  }
                }`,
        variables: {
          id,
        },
      };
      const response = await context.fetcher.fetch({
        method: 'POST',
        url: `${context.endpoint}/admin/api/2023-04/graphql.json`,
        cacheTtlSecs: 0,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': getTokenPlaceholder(context),
        },
        body: JSON.stringify(payload),
      });

      const { body } = response;
      return body.data.metaobjectDelete.deletedId;
    },
  });

  const MetaObjectSchema = coda.makeObjectSchema({
    properties: {
      gid: { type: coda.ValueType.String, required: true },
      // A unique, human-readable string for the collection automatically generated from its title. This is used in themes by the Liquid templating language to refer to the collection. (limit: 255 characters)
      name: { type: coda.ValueType.String },
      data: { type: coda.ValueType.String },
    },
    displayProperty: 'name',
    idProperty: 'gid',
    featuredProperties: ['gid', 'name', 'data'],
  });

  pack.addSyncTable({
    name: 'MetaObjects',
    description: 'All metaobjects.',
    identityName: 'MetaObject',
    schema: MetaObjectSchema,
    formula: {
      name: 'SyncMetaObjects',
      description: '<Help text for the sync formula, not show to the user>',
      parameters: [
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'type',
          description: 'The maximum number of results to fetch by page. (max: 250)',
        }),
        coda.makeParameter({
          type: coda.ParameterType.String,
          name: 'objectFieldName',
          description: '???',
        }),
        coda.makeParameter({
          type: coda.ParameterType.StringArray,
          name: 'additionalFields',
          description: '???',
          optional: true,
        }),
        coda.makeParameter({
          type: coda.ParameterType.Number,
          name: 'limit',
          description: 'Return only products after the specified ID.',
          optional: true,
        }),
      ],
      execute: async function ([type, objectFieldName, additionalFields, limit = 100], context) {
        const payload = {
          query: `query ($numObjects: Int!, $cursor: String) {
                      metaobjects(type: "${type}", first: $numObjects, after: $cursor) {
                          nodes {
                              id
                              name: field(key: "${objectFieldName}") { value }
                              ${additionalFields.map((key) => `${key}: field(key: "${key}") { value }`).join('\n')}
                          }

                          pageInfo {
                              hasNextPage
                              endCursor
                          }
                      }
                  }`,
          variables: {
            numObjects: limit,
            cursor: context.sync.continuation,
          },
        };

        const response = await context.fetcher.fetch({
          method: 'POST',
          url: `${context.endpoint}/admin/api/2023-04/graphql.json`,
          cacheTtlSecs: 0,
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': getTokenPlaceholder(context),
          },
          body: JSON.stringify(payload),
        });

        const { body } = response;

        const { nodes, pageInfo } = body.data.metaobjects;

        return {
          result: nodes.map((node) => {
            const data = {};
            additionalFields.forEach((key) => {
              data[key] = node[key].value;
            });

            return {
              gid: node.id,
              name: node.name.value,

              data: JSON.stringify(
                data
                //   {
                //   adresse: node.address.value,
                //   latitude: node.lat.value,
                //   longitude: node.lon.value,
                //   image: node.image.value,
                // }
              ),
            };
          }),
          continuation: pageInfo.hasNextPage ? pageInfo.endCursor : null,
        };
      },
    },
  });

  /**====================================================================================================================
   *    Column formats
   *===================================================================================================================== */
  pack.addColumnFormat({
    name: 'ProductMetafields',
    instructions: 'Retrieve all product metafields',
    formulaName: 'ProductMetafields',
  });

  pack.addColumnFormat({
    name: 'Metafield',
    instructions: 'Retrieve a single metafield',
    formulaName: 'Metafield',
  });
};
