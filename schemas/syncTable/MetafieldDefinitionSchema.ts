import * as coda from '@codahq/packs-sdk';

import { PACK_IDENTITIES, NOT_FOUND } from '../../constants';
import { CODA_PACK_ID } from '../../pack-config.json';
import { MetafieldOwnerType } from '../../types/admin.types';
import { ValidationSchema } from '../basic/ValidationSchema';
import { FormatRowReferenceFn } from '../CodaRows.types';

export const MetafieldDefinitionSyncTableSchema = coda.makeObjectSchema({
  properties: {
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'admin_url',
      description: 'A link to the metafield in the Shopify admin.',
    },
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'id',
      required: true,
      useThousandsSeparator: false,
    },
    graphql_gid: {
      type: coda.ValueType.String,
      fixedId: 'graphql_gid',
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the metafield definition.',
    },
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
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
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
  featuredProperties: ['name', 'type', 'description', 'namespace', 'key', 'id', 'metafieldsCount', 'admin_url'],

  // Card fields.
  subtitleProperties: ['type', 'namespace', 'key', 'ownerType', 'metafieldsCount'],
  snippetProperty: 'description',
  linkProperty: 'admin_url',
});

export function getMetafieldDefinitionReferenceSchema(metafieldOwnerType: MetafieldOwnerType) {
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

export const formatMetafieldDefinitionReference: FormatRowReferenceFn<number, 'name'> = (
  id: number,
  name = NOT_FOUND
) => ({
  id,
  name,
});
