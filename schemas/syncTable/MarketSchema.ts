import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { NOT_FOUND } from '../../constants/strings-constants';
import { FormatRowReferenceFn } from '../CodaRows.types';

export const MarketSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: PROPS.makeAdminUrlProp('market'),
    id: PROPS.makeRequiredIdNumberProp('market'),
    graphql_gid: PROPS.makeGraphQlGidProp('market'),
    handle: {
      ...PROPS.makeHandleProp('market'),
      description: 'A short, human-readable unique identifier for the market.',
    },
    name: {
      ...PROPS.STRING,
      fromKey: 'name',
      fixedId: 'name',
      required: true,
      description: 'The name of the market. Not shown to customers.',
    },
    primary: {
      ...PROPS.BOOLEAN,
      fromKey: 'primary',
      fixedId: 'primary',
      description: 'Whether the market is the shop’s primary market.',
    },
    enabled: {
      ...PROPS.BOOLEAN,
      fromKey: 'enabled',
      fixedId: 'enabled',
      description: 'Whether the market is enabled to receive visitors and sales.',
    },
  },
  displayProperty: 'name',
  idProperty: 'id',
  featuredProperties: ['admin_url', 'name', 'handle', 'primary', 'enabled'],
});
export const MarketReference = coda.makeReferenceSchemaFromObjectSchema(MarketSyncTableSchema, PACK_IDENTITIES.Market);
export const formatMarketReference: FormatRowReferenceFn<number, 'name'> = (id: number, name = NOT_FOUND) => ({
  id,
  name,
});
