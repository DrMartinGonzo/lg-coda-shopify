import * as coda from '@codahq/packs-sdk';
import { METAFIELD_TYPES } from '../../metafields/metafields-constants';
import { ProductReference } from './ProductSchemaRest';
import { CollectionReference } from './CollectionSchema';
import { PageReference } from './PageSchema';
import { FileReference } from './FileSchema';
import { ProductVariantReference } from './ProductVariantSchema';

export const MetafieldSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'graphql_gid',
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the metafield.',
    },
    id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'id',
      required: true,
      useThousandsSeparator: false,
    },
    label: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'label',
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      fixedId: 'admin_url',
      description: 'A link to the metafield in the Shopify admin.',
    },
    key: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'key',
      description:
        'The key of the metafield. Keys can be up to 64 characters long and can contain alphanumeric characters, hyphens, underscores, and periods.',
    },
    hasDefinition: {
      type: coda.ValueType.Boolean,
      required: true,
      fixedId: 'hasDefinition',
      description: 'Wether the metafield has a definition.',
    },
    namespace: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'namespace',
      description:
        'The container for a group of metafields that the metafield is or will be associated with. Used in tandem with `key` to lookup a metafield on a resource, preventing conflicts with other metafields with the same `key`. Must be 3-255 characters long and can contain alphanumeric, hyphen, and underscore characters.',
    },
    owner_id: {
      type: coda.ValueType.Number,
      required: true,
      useThousandsSeparator: false,
      fixedId: 'owner_id',
      description: 'The ID of the resource that the metafield is attached to.',
    },
    owner_type: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'owner_type',
      description: 'The type of the resource that the metafield is attached to.',
    },
    rawValue: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'rawValue',
      description:
        "The data stored in the metafield in its raw form. The value is always stored as a string, regardless of the metafield's type. For some metafields, you can use helper columns to facilitate editing it. E.g. for references.",
    },
    type: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.SelectList,
      options: Object.values(METAFIELD_TYPES),
      required: true,
      fixedId: 'type',
      description:
        'The type of data that the metafield stores. Refer to the list of supported types (https://shopify.dev/apps/metafields/types).',
    },
    created_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      required: true,
      fixedId: 'created_at',
      description: 'The date and time (ISO 8601 format) when the metafield was created.',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      required: true,
      fixedId: 'updated_at',
      description: 'The date and time (ISO 8601 format) when the metafield was last updated.',
    },
    editCollectionReference: {
      ...CollectionReference,
      fixedId: 'editCollectionReference',
      fromKey: 'editCollectionReference',
      mutable: true,
      description: `Helper column to edit a metafield whose value is of '${METAFIELD_TYPES.collection_reference}' type.`,
    },
    editCollectionReferenceList: {
      type: coda.ValueType.Array,
      items: CollectionReference,
      fixedId: 'editCollectionReferenceList',
      fromKey: 'editCollectionReferenceList',
      mutable: true,
      description: `Helper column to edit a metafield whose value is of '${METAFIELD_TYPES.list_collection_reference}' type.`,
    },
    editFileReference: {
      ...FileReference,
      fixedId: 'editFileReference',
      fromKey: 'editFileReference',
      mutable: true,
      description: `Helper column to edit a metafield whose value is of '${METAFIELD_TYPES.file_reference}' type.`,
    },
    editFileReferenceList: {
      type: coda.ValueType.Array,
      items: FileReference,
      fixedId: 'editFileReferenceList',
      fromKey: 'editFileReferenceList',
      mutable: true,
      description: `Helper column to edit a metafield whose value is of '${METAFIELD_TYPES.list_file_reference}' type.`,
    },
    editPageReference: {
      ...PageReference,
      fixedId: 'editPageReference',
      fromKey: 'editPageReference',
      mutable: true,
      description: `Helper column to edit a metafield whose value is of '${METAFIELD_TYPES.page_reference}' type.`,
    },
    editPageReferenceList: {
      type: coda.ValueType.Array,
      items: PageReference,
      fixedId: 'editPageReferenceList',
      fromKey: 'editPageReferenceList',
      mutable: true,
      description: `Helper column to edit a metafield whose value is of '${METAFIELD_TYPES.list_page_reference}' type.`,
    },
    editProductReference: {
      ...ProductReference,
      fixedId: 'editProductReference',
      fromKey: 'editProductReference',
      mutable: true,
      description: `Helper column to edit a metafield whose value is of '${METAFIELD_TYPES.product_reference}' type.`,
    },
    editProductReferenceList: {
      type: coda.ValueType.Array,
      items: ProductReference,
      fixedId: 'editProductReferenceList',
      fromKey: 'editProductReferenceList',
      mutable: true,
      description: `Helper column to edit a metafield whose value is of '${METAFIELD_TYPES.list_product_reference}' type.`,
    },
    editProductVariantReference: {
      ...ProductVariantReference,
      fixedId: 'editProductVariantReference',
      fromKey: 'editProductVariantReference',
      mutable: true,
      description: `Helper column to edit a metafield whose value is of '${METAFIELD_TYPES.variant_reference}' type.`,
    },
    editProductVariantReferenceList: {
      type: coda.ValueType.Array,
      items: ProductVariantReference,
      fixedId: 'editProductVariantReferenceList',
      fromKey: 'editProductVariantReferenceList',
      mutable: true,
      description: `Helper column to edit a metafield whose value is of '${METAFIELD_TYPES.list_variant_reference}' type.`,
    },
  },
  displayProperty: 'label',
  idProperty: 'id',
  featuredProperties: ['key', 'id', 'owner_id', 'rawValue', 'type'],

  // Card fields.
  subtitleProperties: ['id', 'type', 'owner_type', 'updated_at'],
  snippetProperty: 'rawValue',
  // imageProperty: 'featuredImage',
  linkProperty: 'admin_url',
});

export const MetafieldFormulaSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: {
      type: coda.ValueType.String,
      fromKey: 'admin_graphql_api_id',
      description: 'The GraphQL GID of the metafield.',
      fixedId: 'graphql_gid',
      required: true,
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
        "The stored in the metafield. The value is always stored as a string, regardless of the metafield's type.",
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
      description: 'The date and time when the metafield was created.',
      fixedId: 'created_at',
    },
    updated_at: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.DateTime,
      description: 'The date and time when the metafield was last updated.',
      fixedId: 'updated_at',
    },
  },
  displayProperty: 'lookup',
  idProperty: 'graphql_gid',
  featuredProperties: ['namespace', 'key', 'value', 'owner_id', 'type'],
});

export const MetafieldBaseSyncSchema = coda.makeObjectSchema({
  properties: {
    owner_gid: {
      type: coda.ValueType.String,
      description: 'The GraphQL GID of the resource owning the metafield.',
      fromKey: 'id',
      fixedId: 'owner_gid',
      required: true,
    },
    admin_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
      description: 'A link to the metafields in the Shopify admin.',
    },
  },
  displayProperty: 'owner_gid',
  idProperty: 'owner_gid',
  featuredProperties: ['owner_gid', 'admin_url'],
});

export const metafieldSyncTableHelperEditColumns = [
  { key: 'editCollectionReference', type: METAFIELD_TYPES.collection_reference },
  { key: 'editCollectionReferenceList', type: METAFIELD_TYPES.list_collection_reference },
  { key: 'editFileReference', type: METAFIELD_TYPES.file_reference },
  { key: 'editFileReferenceList', type: METAFIELD_TYPES.list_file_reference },
  { key: 'editPageReference', type: METAFIELD_TYPES.page_reference },
  { key: 'editPageReferenceList', type: METAFIELD_TYPES.list_page_reference },
  { key: 'editProductReference', type: METAFIELD_TYPES.product_reference },
  { key: 'editProductReferenceList', type: METAFIELD_TYPES.list_product_reference },
  { key: 'editProductVariantReference', type: METAFIELD_TYPES.variant_reference },
  { key: 'editProductVariantReferenceList', type: METAFIELD_TYPES.list_variant_reference },
];
