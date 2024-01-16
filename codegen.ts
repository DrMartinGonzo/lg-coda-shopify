import { ApiType, pluckConfig, preset } from '@shopify/api-codegen-preset';
import { GRAPHQL_DEFAULT_API_VERSION } from './constants';

export default {
  // For syntax highlighting / auto-complete when writing operations
  schema: `https://shopify.dev/admin-graphql-direct-proxy/${GRAPHQL_DEFAULT_API_VERSION}`,
  // documents: ['./**/*.{js,ts,jsx,tsx}'],
  documents: ['./**/*-graphql.ts'],
  projects: {
    default: {
      // For type extraction
      schema: `https://shopify.dev/admin-graphql-direct-proxy/${GRAPHQL_DEFAULT_API_VERSION}`,

      documents: ['./**/*-graphql.ts'],
      extensions: {
        codegen: {
          // Enables support for `#graphql` tags, as well as `/* GraphQL */`
          pluckConfig,
          generates: {
            './types/admin.schema.json': {
              plugins: ['introspection'],
              config: { minify: false },
            },
            './types/admin.types.d.ts': {
              plugins: ['typescript'],
            },
            './types/admin.generated.d.ts': {
              preset,
              presetConfig: {
                apiType: ApiType.Admin,
              },
            },
          },
        },
      },
    },
  },
};
