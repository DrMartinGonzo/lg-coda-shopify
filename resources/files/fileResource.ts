import { TadaDocumentNode } from 'gql.tada';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { RestResourcePlural, RestResourceSingular } from '../../Fetchers/ShopifyRestResource.types';
import { FileRow } from '../../schemas/CodaRows.types';
import { FileSyncTableSchema } from '../../schemas/syncTable/FileSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { ResourceWithMetafieldDefinitions, ResourceWithMetafields } from '../Resource.types';
import { FieldNode } from 'graphql';
import { UpdateFile, deleteFiles, queryAllFiles, querySingleFile } from './files-graphql';

// #region GraphQl Parameters

// #endregion

// TODO: finish this
const fileResourceBase = {
  display: 'File',
  schema: FileSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.GenericFile,
    singular: 'file',
    plural: 'files',
    operations: {
      fetchSingle: querySingleFile,
      fetchAll: queryAllFiles,
      update: UpdateFile,
      delete: deleteFiles,
    },
  },
  rest: {
    singular: RestResourceSingular.Collection,
    plural: RestResourcePlural.Collection,
  },
  metafields: {
    ownerType: MetafieldOwnerType.MediaImage,
    useGraphQl: true,
    hasSyncTable: false,
    supportsDefinitions: false,
  },
} as const;

export type File = ResourceWithMetafields<
  typeof fileResourceBase,
  {
    codaRow: FileRow;
    rest: {
      params: {};
    };
  }
>;

export const fileResource = fileResourceBase as File;
