import { ApiType, pluckConfig, preset } from '@shopify/api-codegen-preset';
import { GRAPHQL_DEFAULT_API_VERSION } from './constants';
import { preset as hydrogenCodegenPreset } from '@shopify/hydrogen-codegen';
import { apiConfigs as shopifyApiConfigs } from './node_modules/@shopify/api-codegen-preset/dist/helpers/api-configs';

/**
 * Force importTypesFrom to use `.ts` extension. `.d.ts` doesn't support
 * importing enums from
 */
shopifyApiConfigs.Admin.presetConfigs.importTypesFrom = './admin.types.ts';

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
            './typesNew/generated/admin.schema.json': {
              plugins: ['introspection'],
              config: { minify: false },
            },
            './typesNew/generated/admin.types.ts': {
              plugins: ['typescript'],
            },
            './typesNew/generated/admin.generated.d.ts': {
              presetConfig: {
                apiType: ApiType.Admin,
              },
              // Taken and modified from @shopify/api-codegen-preset
              preset: {
                buildGeneratesSection: (options) => {
                  const apiType = options.presetConfig.apiType;
                  const { interfaceExtension, module, presetConfigs } = shopifyApiConfigs[apiType];
                  return hydrogenCodegenPreset.buildGeneratesSection({
                    ...options,
                    presetConfig: {
                      ...presetConfigs,
                      importTypesFrom: './admin.types.ts',
                      interfaceExtension: ({ queryType, mutationType }) =>
                        interfaceExtension
                          .replace('%%MODULE%%', options.presetConfig.module ?? module)
                          .replace('%%QUERY%%', queryType)
                          .replace('%%MUTATION%%', mutationType),
                    },
                  });
                },
              },
            },
          },
        },
      },
    },
  },
};
