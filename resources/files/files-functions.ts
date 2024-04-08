import * as coda from '@codahq/packs-sdk';
import { readFragment } from '../../utils/graphql';

import { SyncTableParamValues } from '../../Fetchers/SyncTableRest';
import { FileRow } from '../../schemas/CodaRows.types';
import { FileGraphQlFetcher } from './FileGraphQlFetcher';
import { Sync_Files } from './files-coda';
import { fileFieldsFragment } from './files-graphql';

// #region Helpers
export async function handleFileUpdateJob(
  row: {
    original?: FileRow;
    updated: FileRow;
  },
  params,
  context: coda.ExecutionContext
) {
  const [type, previewSize] = params as SyncTableParamValues<typeof Sync_Files>;
  let obj = row.original ?? ({} as FileRow);

  const fileFetcher = new FileGraphQlFetcher(context);
  // const fileUpdateInput = formatGraphQlFileUpdateInput(row.updated);
  const fileUpdateInput = fileFetcher.formatRowToApi(row.updated);
  if (fileUpdateInput !== undefined) {
    const updateJob = await fileFetcher.update([fileUpdateInput]);
    if (updateJob?.body?.data?.fileUpdate?.files) {
      const files = readFragment(fileFieldsFragment, updateJob.body.data.fileUpdate.files);
      const file = files.find((file) => file.id === fileUpdateInput.id);
      obj = {
        ...obj,
        ...fileFetcher.formatApiToRow(file, previewSize),
      };
    }
  }
  return obj;
}
// #endregion
