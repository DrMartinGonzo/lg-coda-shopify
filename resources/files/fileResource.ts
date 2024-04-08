import { GraphQlResourceName } from '../ShopifyResource.types';
import { RestResourcePlural, RestResourceSingular } from '../ShopifyResource.types';
import { FileRow } from '../../schemas/CodaRows.types';
import { FileSyncTableSchema } from '../../schemas/syncTable/FileSchema';
import { MetafieldOwnerType } from '../../types/admin.types';
import { ResourceWithMetafields } from '../Resource.types';

// TODO: finish this
const fileResourceBase = {
  display: 'File',
  schema: FileSyncTableSchema,
  graphQl: {
    name: GraphQlResourceName.GenericFile,
    singular: 'file',
    plural: 'files',
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
  }
>;

export const fileResource = fileResourceBase as File;
