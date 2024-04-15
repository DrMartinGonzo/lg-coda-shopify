import { createHash } from 'node:crypto';
import { GraphQlClient } from '../Clients/GraphQlClient';
import { VariablesOf, graphql } from './tada-utils';

const bite = async ([productId, ...varargs], context) => {
  const fields = [];
  while (varargs.length > 0) {
    let namespace: string, key: string;
    // Pull the first set of varargs off the list, and leave the rest.
    [namespace, key, ...varargs] = varargs;
    fields.push(`
      ${key}: metafield(
          namespace: "${namespace}"
          key: "${key}"
      ) {
          ...metafieldFields
      }
    `);
  }

  const query = graphql(
    `
      query product($productId: ID!) {
        product(id: $productId) {
          ${fields.join('\n')}
        }
    }

    fragment metafieldFields on Metafield {
        id
        type
        value
    }`
  );

  const documentNode = query;
  const variables = {
    productId: productId,
  } as VariablesOf<typeof documentNode>;

  const graphQlClient = new GraphQlClient({ context });
  const response = await graphQlClient.request<typeof documentNode>({
    documentNode,
    variables,
  });

  const { body } = response;
  // return body.data.product.metaobject.id;

  // @ts-ignore
  if (body.data.product.color) {
    const mutationQuery = graphql(
      `
        mutation translationsRegister($resourceId: ID!, $translations: [TranslationInput!]!) {
          translationsRegister(resourceId: $resourceId, translations: $translations) {
            userErrors {
              field
              message
            }
            translations {
              key
              value
            }
          }
        }
      `
    );

    const documentNode = mutationQuery;
    const variables = {
      // @ts-ignore
      resourceId: body.data.product.color.id,
      translations: [
        {
          locale: 'en',
          key: 'value',
          value: '["black"]',
          // @ts-ignore
          translatableContentDigest: createHash('sha256').update(body.data.product.color.value).digest('hex'),
        },
      ],
    } as VariablesOf<typeof documentNode>;
  }
};

export const translateResource = async ([resourceId, ...varargs], context) => {
  const translations = [];
  while (varargs.length > 0) {
    let locale: string, key: string, value: string, digest: string;
    // Pull the first set of varargs off the list, and leave the rest.
    [locale, key, value, digest, ...varargs] = varargs;
    translations.push({
      locale,
      key,
      value,
      translatableContentDigest: digest,
    });
  }

  const mutationQuery = graphql(
    `
      mutation translationsRegister($resourceId: ID!, $translations: [TranslationInput!]!) {
        translationsRegister(resourceId: $resourceId, translations: $translations) {
          userErrors {
            field
            message
          }

          translations {
            key
            value
          }
        }
      }
    `
  );

  const documentNode = mutationQuery;
  const variables = {
    resourceId: resourceId,
    translations,
  } as VariablesOf<typeof documentNode>;

  const graphQlClient = new GraphQlClient({ context });
  const response = await graphQlClient.request<typeof documentNode>({
    documentNode,
    variables,
  });

  const { body } = response;
  console.log('body', body);
  // return body;
  return true;
};

export const getTranslatableResource = async ([resourceId, locale], context) => {
  const query = `
    query translatableResource($resourceId: ID!) {
      translatableResource(resourceId: $resourceId) {
        resourceId
        translations(locale: "${locale}") {
            locale
            key
            value
        }
        translatableContent {
          key
          value
          digest
          locale
        }
      }
    }
  `;

  const documentNode = graphql(
    `
    query translatableResource($resourceId: ID!) {
      translatableResource(resourceId: $resourceId) {
        resourceId
        translations(locale: "${locale}") {
            locale
            key
            value
        }
        translatableContent {
          key
          value
          digest
          locale
        }
      }
    }`
  );

  const variables = {
    resourceId: resourceId,
  } as VariablesOf<typeof documentNode>;

  const graphQlClient = new GraphQlClient({ context });
  const response = await graphQlClient.request<typeof documentNode>({
    documentNode,
    variables,
  });

  const { body } = response;
  return body.data.translatableResource;
};
