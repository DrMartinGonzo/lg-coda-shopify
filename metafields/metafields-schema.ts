import * as coda from '@codahq/packs-sdk';
import * as accents from 'remove-accents';

import { METAFIELD_GID_PREFIX_KEY, METAFIELD_PREFIX_KEY } from '../constants';
import { capitalizeFirstChar } from '../helpers';
import { fetchMetafieldDefinitions, getMetafieldDefinitionFullKey } from '../metafields/metafields-functions';
import { mapMetaFieldToSchemaProperty } from '../metaobjects/metaobjects-schema';

export const MetafieldSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the metafield.',
      fixedId: 'graphql_gid',
    },
    metafield_id: {
      type: coda.ValueType.String,
      required: true,
      fromKey: 'id',
      fixedId: 'metafield_id',
    },
    lookup: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'lookup',
    },
    key: {
      type: coda.ValueType.String,
      required: true,
      description:
        'The key of the metafield. Keys can be up to 64 characters long and can contain alphanumeric characters, hyphens, underscores, and periods.',
      fixedId: 'key',
    },
    namespace: {
      type: coda.ValueType.String,
      description:
        'The container for a group of metafields that the metafield is or will be associated with. Used in tandem with `key` to lookup a metafield on a resource, preventing conflicts with other metafields with the same `key`. Must be 3-255 characters long and can contain alphanumeric, hyphen, and underscore characters.',
      fixedId: 'namespace',
    },
    description: {
      type: coda.ValueType.String,
      description: 'A description of the information that the metafield contains.',
      fixedId: 'description',
    },
    owner_id: {
      type: coda.ValueType.String,
      required: true,
      description: 'The unique ID of the resource that the metafield is attached to.',
      fixedId: 'owner_id',
    },
    owner_resource: {
      type: coda.ValueType.String,
      required: true,
      description: 'The type of resource that the metafield is attached to.',
      fixedId: 'owner_resource',
    },
    value: {
      type: coda.ValueType.String,
      required: true,
      description:
        "The data to store in the metafield. The value is always stored as a string, regardless of the metafield's type.",
      fixedId: 'value',
    },
    type: {
      type: coda.ValueType.String,
      required: true,
      description:
        'The type of data that the metafield stores in the `value` field. Refer to the list of supported types (https://shopify.dev/apps/metafields/types).',
      fixedId: 'type',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time (ISO 8601 format) when the metafield was created.',
      fixedId: 'created_at',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time (ISO 8601 format) when the metafield was last updated.',
      fixedId: 'updated_at',
    },
  },
  displayProperty: 'lookup',
  idProperty: 'metafield_id',
  featuredProperties: ['key', 'owner_id', 'value', 'type'],
});

export const MetafieldSchemaNew = coda.makeObjectSchema({
  properties: {
    graphql_gid: {
      type: coda.ValueType.String,
      description: 'The GraphQL GID of the metafield.',
      fromKey: 'id',
      fixedId: 'graphql_gid',
    },
    data: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'data',
    },
  },
  displayProperty: 'graphql_gid',
  idProperty: 'graphql_gid',
  featuredProperties: ['graphql_gid', 'data'],
});

export async function augmentSchemaWithMetafields(
  baseSchema: coda.ObjectSchema<any, any>,
  ownerType: string,
  context: coda.SyncExecutionContext
) {
  const schema: coda.ObjectSchema<any, any> = { ...baseSchema };

  const metafieldDefinitions = await fetchMetafieldDefinitions(ownerType, context);
  metafieldDefinitions.forEach((metafieldDefinition) => {
    const name = accents.remove(metafieldDefinition.name);
    const fullKey = getMetafieldDefinitionFullKey(metafieldDefinition);
    const matchingSchemaKey = METAFIELD_PREFIX_KEY + fullKey;
    const matchingSchemaGidKey = METAFIELD_GID_PREFIX_KEY + fullKey;
    const propName = `Meta ${capitalizeFirstChar(name)}`;

    /* We prefix fromKey to be able to determine later wich columns are metafield values */
    schema.properties[propName] = {
      ...mapMetaobjectFieldToSchemaProperty(metafieldDefinition),
      fromKey: matchingSchemaKey,
      fixedId: matchingSchemaKey,
    };
    // Add eventual choices
    const choicesValidation = metafieldDefinition.validations.find((v) => v.name === 'choices');
    if (choicesValidation && choicesValidation.value) {
      schema.properties[propName]['codaType'] = coda.ValueHintType.SelectList;
      schema.properties[propName]['options'] = JSON.parse(choicesValidation.value);
    }

    /* Another property to store field GraphQL GID */
    schema.properties[`Meta Gid ${capitalizeFirstChar(name)}`] = {
      type: coda.ValueType.String,
      fromKey: matchingSchemaGidKey,
      fixedId: matchingSchemaGidKey,
    };

    // always feature metafields properties so that the user know they are synced by default
    schema.featuredProperties.push(propName);
  });

  return schema;
}
