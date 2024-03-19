import { GRAPHQL_DEFAULT_API_VERSION } from './config/config';

export default {
  projects: {
    default: {
      schema: `https://shopify.dev/admin-graphql-direct-proxy/${GRAPHQL_DEFAULT_API_VERSION}`,
      documents: ['./**/*-graphql.ts'],
      extensions: {
        codegen: {
          generates: {
            './types/admin.types.ts': {
              plugins: ['typescript'],
              config: {
                // onlyOperationTypes: true,
                printFieldsOnNewLines: true,
                extractAllFieldsToTypes: true,
              },
            },
          },
        },
      },
    },
  },
};
