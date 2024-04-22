import { GRAPHQL_DEFAULT_API_VERSION } from './config';

export default {
  // global defaults for all projects
  schema: [`https://shopify.dev/admin-graphql-direct-proxy/${GRAPHQL_DEFAULT_API_VERSION}`],
  // documents: ['./**/*-graphql.ts'],
  extensions: {
    languageService: {
      // cacheSchemaFileForLookup: true,
      enableValidation: false,
    },
  },
};
