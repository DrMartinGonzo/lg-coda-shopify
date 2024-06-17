import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';
import { PACK_IDENTITIES } from '../../constants/pack-constants';
import { NOT_FOUND } from '../../constants/strings-constants';
import { CODA_PACK_ID } from '../../pack-config.json';
import { MetafieldOwnerType } from '../../types/admin.types';
import { FormatRowReferenceFn } from '../CodaRows.types';
import { ValidationSchema } from '../basic/ValidationSchema';

export const MetafieldDefinitionSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: PROPS.makeAdminUrlProp('metafield definition'),
    id: PROPS.makeRequiredIdNumberProp('metafield definition'),
    graphql_gid: PROPS.makeGraphQlGidProp('metafield definition'),
    description: {
      type: coda.ValueType.String,
      fixedId: 'description',
      fromKey: 'description',
      description: 'The description of the metafield definition.',
    },
    key: {
      type: coda.ValueType.String,
      fixedId: 'key',
      description: 'The unique identifier for the metafield definition within its namespace.',
    },
    name: {
      type: coda.ValueType.String,
      fixedId: 'name',
      fromKey: 'name',
      required: true,
      description: 'The human-readable name of the metafield definition.',
    },
    metafieldsCount: {
      type: coda.ValueType.Number,
      fromKey: 'metafieldsCount',
      fixedId: 'metafieldsCount',
      description: 'The count of the metafields that belong to the metafield definition.',
    },
    namespace: {
      type: coda.ValueType.String,
      fixedId: 'namespace',
      description: 'The container for a group of metafields that the metafield definition is associated with.',
    },
    pinnedPosition: {
      type: coda.ValueType.Number,
      fromKey: 'pinnedPosition',
      fixedId: 'pinnedPosition',
      description: 'The position of the metafield definition in the pinned list.',
    },
    type: {
      type: coda.ValueType.String,
      fromKey: 'type',
      fixedId: 'type',
      description: 'The type of data that each of the metafields that belong to the metafield definition will store.',
    },
    validations: {
      type: coda.ValueType.Array,
      items: ValidationSchema,
      fromKey: 'validations',
      fixedId: 'validations',
      description: 'The validation status for the metafields that belong to the metafield definition.',
    },
    validationStatus: {
      ...PROPS.SELECT_LIST,
      fromKey: 'validationStatus',
      fixedId: 'validationStatus',
      description: 'The validation status for the metafields that belong to the metafield definition.',
    },
    visibleToStorefrontApi: {
      type: coda.ValueType.Boolean,
      fromKey: 'visibleToStorefrontApi',
      fixedId: 'visibleToStorefrontApi',
      description:
        'Whether each of the metafields that belong to the metafield definition are visible from the Storefront API.',
    },
    ownerType: {
      type: coda.ValueType.String,
      fixedId: 'ownerType',
      fromKey: 'ownerType',
      description: 'The resource type that the metafield definition is attached to.',
    },
  },
  displayProperty: 'name',
  idProperty: 'id',
  featuredProperties: [
    'ownerType',
    'name',
    'namespace',
    'key',
    'type',
    'id',
    'description',
    'metafieldsCount',
    'admin_url',
  ],

  // Card fields.
  subtitleProperties: ['type', 'namespace', 'key', 'ownerType', 'metafieldsCount'],
  snippetProperty: 'description',
  linkProperty: 'admin_url',
});

function getMetafieldDefinitionReferenceSchema(metafieldOwnerType: MetafieldOwnerType) {
  return coda.makeObjectSchema({
    codaType: coda.ValueHintType.Reference,
    properties: {
      id: { type: coda.ValueType.Number, required: true },
      name: { type: coda.ValueType.String, required: true },
    },
    displayProperty: 'name',
    idProperty: 'id',
    identity: {
      packId: CODA_PACK_ID,
      name: PACK_IDENTITIES.MetafieldDefinition,
      dynamicUrl: metafieldOwnerType,
    },
  });
}
export const MetafieldDefinitionReference = coda.makeReferenceSchemaFromObjectSchema(
  MetafieldDefinitionSyncTableSchema,
  PACK_IDENTITIES.MetafieldDefinition
);
export const formatMetafieldDefinitionReference: FormatRowReferenceFn<number, 'name'> = (
  id: number,
  name = NOT_FOUND
) => ({
  id,
  name,
});
