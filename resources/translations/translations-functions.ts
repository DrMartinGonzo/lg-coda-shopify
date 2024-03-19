
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

  const mutationQuery = `
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
  `;

  const payload = {
    query: mutationQuery,

    variables: {
      resourceId: resourceId,
      translations,
    },
  };

  const { response } = await makeGraphQlRequest({ payload }, context);

  const { body } = response;
  console.log('body', body);
  // return body;
  return true;
};

export const getTranslatableResource = async ([resourceId, locale], context) => {
  const mutationQuery = `
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

  const payload = {
    query: mutationQuery,
    variables: {
      resourceId: resourceId,
    },
  };

  const { response } = await makeGraphQlRequest<{ translatableResource: any }>({ payload }, context);

  const { body } = response;
  return body.data.translatableResource;
};
