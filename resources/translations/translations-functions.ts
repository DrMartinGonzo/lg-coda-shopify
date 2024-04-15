import { createHash } from 'node:crypto';
import { GraphQlClientNEW } from '../../Fetchers/NEW/GraphQlClientNEW';
import { VariablesOf, graphql } from '../../utils/graphql';

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

  const graphQlClient = new GraphQlClientNEW({ context });
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

  const graphQlClient = new GraphQlClientNEW({ context });
  const response = await graphQlClient.request<typeof documentNode>({
    documentNode,
    variables,
  });

  const { body } = response;
  return body.data.translatableResource;
};
