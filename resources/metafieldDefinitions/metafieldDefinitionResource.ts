import { GraphQlResourceName } from '../ShopifyResource.types';
import { MetafieldDefinitionRow } from '../../schemas/CodaRows.types';
import { MetafieldDefinitionSyncTableSchema } from '../../schemas/syncTable/MetafieldDefinitionSchema';
import { ResourceWithSchema } from '../Resource.types';

const metafieldDefinitionResourceBase = {
  display: 'MetafieldDefinition',
  schema: MetafieldDefinitionSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.MetafieldDefinition,
    singular: 'metafieldDefinition',
    plural: 'metafieldDefinitions',
  },
} as const;

export type MetafieldDefinition = ResourceWithSchema<
  typeof metafieldDefinitionResourceBase,
  {
    codaRow: MetafieldDefinitionRow;
  }
>;

export const metafieldDefinitionResource = metafieldDefinitionResourceBase as MetafieldDefinition;
