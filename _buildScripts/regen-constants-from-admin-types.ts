import { writeFileSync } from 'fs';
import * as toPascalCase from 'to-pascal-case';

import { GraphQLClient, gql } from 'graphql-request';
import { GRAPHQL_DEFAULT_API_VERSION } from '../config';
import { join } from 'path';

async function fetchSchema(url: string) {
  const client = new GraphQLClient(url, {
    headers: {
      // Add any headers if needed
    },
  });

  const query = gql`
    query Introspection {
      countryCodes: __type(name: "CountryCode") {
        kind
        name
        description
        enumValues {
          name
          description
        }
      }
    }
  `;

  try {
    const data = await client.request(query);

    const countryCodes = data['countryCodes']['enumValues'];
    const countryCodesParts = countryCodes.map((country) => {
      return `  [CountryCode.${toPascalCase(country.name)}]: \`${country.description}\``;
    });

    let lol = `/**
 * This file is auto generated from a GraphQl introspection query
 */

import { CountryCode } from './types/admin.types';

/**
 * Les noms complets des pays présent dans l'enum CountryCode présente dans ./admin.types.d.ts
 */
export const countryNames: Record<CountryCode, string> = {
${countryCodesParts.join(',\n')}
} as const;
`;

    writeFileSync('./contants--generated.ts', lol);
  } catch (error) {
    console.error('Error fetching schema:', error);
  }
}

// Usage
const graphqlUrl = `https://shopify.dev/admin-graphql-direct-proxy/${GRAPHQL_DEFAULT_API_VERSION}`;
fetchSchema(graphqlUrl);
