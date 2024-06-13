// #region Imports

import * as coda from '@codahq/packs-sdk';

import { METAFIELD_TYPES, MetafieldType } from '../../models/types/METAFIELD_TYPES';
import * as PROPS from '../../coda/coda-properties';
import { formatMetafieldValueForApi } from '../../utils/metafields-utils';
import { CollectionReference } from './CollectionSchema';
import { FileReference } from './FileSchema';
import { PageReference } from './PageSchema';
import { ProductReference } from './ProductSchema';
import { ProductVariantReference } from './ProductVariantSchema';
// #endregion

function getHelperColumnDescription(metafieldType: MetafieldType) {
  return `Helper column to edit a metafield whose value is of '${metafieldType}' type.`;
}
function makeEditReferenceColumnProp(
  metafieldType: MetafieldType,
  referenceSchema: coda.GenericObjectSchema & coda.ObjectSchemaProperty,
  fixedIdAndFromKey: string
) {
  return {
    ...referenceSchema,
    fixedId: fixedIdAndFromKey,
    fromKey: fixedIdAndFromKey,
    mutable: true,
    description: getHelperColumnDescription(metafieldType),
  };
}
function makeEditReferenceListColumnProp(
  metafieldType: MetafieldType,
  referenceSchema: coda.GenericObjectSchema & coda.ObjectSchemaProperty,
  fixedIdAndFromKey: string
) {
  return {
    type: coda.ValueType.Array,
    items: referenceSchema,
    fromKey: fixedIdAndFromKey,
    mutable: true,
    description: getHelperColumnDescription(metafieldType),
  } as coda.ArraySchema<typeof referenceSchema> & coda.ObjectSchemaProperty;
}

export const MetafieldSyncTableSchema = coda.makeObjectSchema({
  properties: {
    graphql_gid: PROPS.makeGraphQlGidProp('metafield'),
    id: PROPS.makeRequiredIdNumberProp('metafield'),
    label: {
      type: coda.ValueType.String,
      required: true,
      fromKey: 'label',
      fixedId: 'label',
    },
    admin_url: PROPS.makeAdminUrlProp('metafield'),
    key: {
      type: coda.ValueType.String,
      fixedId: 'key',
      description:
        'The key of the metafield. Keys can be up to 64 characters long and can contain alphanumeric characters, hyphens, underscores, and periods.',
    },
    namespace: {
      type: coda.ValueType.String,
      fixedId: 'namespace',
      description:
        'The container for a group of metafields that the metafield is or will be associated with. Used in tandem with `key` to lookup a metafield on a resource, preventing conflicts with other metafields with the same `key`. Must be 3-255 characters long and can contain alphanumeric, hyphen, and underscore characters.',
    },
    owner_id: {
      ...PROPS.ID_NUMBER,
      required: true,
      fromKey: 'owner_id',
      fixedId: 'owner_id',
      description: 'The ID of the resource that the metafield is attached to.',
    },
    owner_type: {
      type: coda.ValueType.String,
      required: true,
      fixedId: 'owner_type',
      description: 'The type of the resource that the metafield is attached to.',
    },
    definition_id: {
      ...PROPS.ID_NUMBER,
      fixedId: 'definition_id',
      fromKey: 'definition_id',
      description: 'The ID of the metafield definition of the metafield, if it exists.',
    },
    rawValue: {
      type: coda.ValueType.String,
      mutable: true,
      fixedId: 'rawValue',
      description:
        "The data stored in the metafield in its raw form. The value is always stored as a string, regardless of the metafield's type. For some metafields, you can use helper columns to facilitate editing it. E.g. for references.",
    },
    type: {
      ...PROPS.SELECT_LIST,
      options: Object.values(METAFIELD_TYPES),
      required: true,
      fromKey: 'type',
      fixedId: 'type',
      description: 'The type of data that the metafield stores.',
    },
    created_at: PROPS.makeCreatedAtProp('metafield'),
    updated_at: PROPS.makeUpdatedAtProp('metafield'),
    editCollectionReference: makeEditReferenceColumnProp(
      METAFIELD_TYPES.collection_reference,
      CollectionReference,
      'editCollectionReference'
    ),
    editCollectionReferenceList: makeEditReferenceListColumnProp(
      METAFIELD_TYPES.list_collection_reference,
      CollectionReference,
      'editCollectionReferenceList'
    ),
    editFileReference: makeEditReferenceColumnProp(METAFIELD_TYPES.file_reference, FileReference, 'editFileReference'),
    editFileReferenceList: makeEditReferenceListColumnProp(
      METAFIELD_TYPES.list_file_reference,
      FileReference,
      'editFileReferenceList'
    ),
    editPageReference: makeEditReferenceColumnProp(METAFIELD_TYPES.page_reference, PageReference, 'editPageReference'),
    editPageReferenceList: makeEditReferenceListColumnProp(
      METAFIELD_TYPES.list_page_reference,
      PageReference,
      'editPageReferenceList'
    ),
    editProductReference: makeEditReferenceColumnProp(
      METAFIELD_TYPES.product_reference,
      ProductReference,
      'editProductReference'
    ),
    editProductReferenceList: makeEditReferenceListColumnProp(
      METAFIELD_TYPES.list_product_reference,
      ProductReference,
      'editProductReferenceList'
    ),
    editProductVariantReference: makeEditReferenceColumnProp(
      METAFIELD_TYPES.variant_reference,
      ProductVariantReference,
      'editProductVariantReference'
    ),
    editProductVariantReferenceList: makeEditReferenceListColumnProp(
      METAFIELD_TYPES.list_variant_reference,
      ProductVariantReference,
      'editProductVariantReferenceList'
    ),
  },
  displayProperty: 'label',
  idProperty: 'id',
  featuredProperties: ['key', 'id', 'owner_id', 'rawValue', 'type'],

  // Card fields.
  subtitleProperties: ['id', 'type', 'owner_type', 'updated_at'],
  snippetProperty: 'rawValue',
  linkProperty: 'admin_url',
});

/**
 *? Si jamais on implémente une colonne pour les currencies,
 *? il faudra veiller a bien passer le currencyCode a {@link formatMetafieldValueForApi}
 */
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
