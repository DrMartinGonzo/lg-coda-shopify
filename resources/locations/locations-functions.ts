import { print as printGql } from '@0no-co/graphql.web';
import * as coda from '@codahq/packs-sdk';
import { ResultOf, VariablesOf, readFragment } from '../../utils/graphql';

import { FetchRequestOptions } from '../../Fetchers/Fetcher.types';
import { GraphQlResourceName } from '../../Fetchers/ShopifyGraphQlResource.types';
import { CACHE_DEFAULT } from '../../constants';
import { GraphQlResponse, idToGraphQlGid, makeGraphQlRequest } from '../../helpers-graphql';
import { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { LocationRow } from '../../schemas/CodaRows.types';
import { CountryCode } from '../../types/admin.types';
import { updateAndFormatResourceMetafieldsGraphQl } from '../metafields/metafields-functions';
import { LocationGraphQlFetcher } from './LocationGraphQlFetcher';
import { editLocationMutation, getLocationsQuery, locationFragment } from './locations-graphql';

// #region Helpers
function formatGraphQlLocationEditAddressInput(parts: {
  address1?: string;
  address2?: string;
  city?: string;
  countryCode?: CountryCode;
  phone?: string;
  provinceCode?: string;
  zip?: string;
}) {
  const ret: VariablesOf<typeof editLocationMutation>['input']['address'] = {
    address1: parts?.address1,
    address2: parts?.address2,
    city: parts?.city,
    countryCode: parts?.countryCode,
    phone: parts?.phone,
    provinceCode: parts?.provinceCode,
    zip: parts?.zip,
  };

  Object.keys(ret).forEach((key) => {
    if (ret[key] === undefined) delete ret[key];
  });
  // No input, we have nothing to update.
  if (Object.keys(ret).length === 0) return undefined;
  return ret;
}

function formatGraphQlLocationEditInput(params: {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  countryCode?: CountryCode;
  phone?: string;
  provinceCode?: string;
  zip?: string;
}) {
  const ret: VariablesOf<typeof editLocationMutation>['input'] = {
    name: params.name,
    address: formatGraphQlLocationEditAddressInput({
      address1: params.address1,
      address2: params.address2,
      city: params.city,
      countryCode: params.countryCode,
      phone: params.phone,
      provinceCode: params.provinceCode,
      zip: params.zip,
    }),
  };

  Object.keys(ret).forEach((key) => {
    if (ret[key] === undefined) delete ret[key];
  });
  // No input, we have nothing to update.
  if (Object.keys(ret).length === 0) return undefined;
  return ret;
}

export async function handleLocationUpdateJob(
  row: {
    original?: LocationRow;
    updated: LocationRow;
  },
  metafieldKeyValueSets: Array<CodaMetafieldKeyValueSet> = [],
  context: coda.ExecutionContext
) {
  let obj = row.original ?? ({} as LocationRow);
  const updatedRow = row.updated;

  const locationFetcher = new LocationGraphQlFetcher(context);

  const locationId = updatedRow.id;
  const locationGid = idToGraphQlGid(GraphQlResourceName.Location, locationId);
  const subJobs: (Promise<any> | undefined)[] = [];

  const locationEditInput = formatGraphQlLocationEditInput({
    name: updatedRow.name,
    address1: updatedRow.address1,
    address2: updatedRow.address2,
    city: updatedRow.city,
    countryCode: updatedRow.country_code as CountryCode,
    phone: updatedRow.phone,
    provinceCode: updatedRow.province_code,
    zip: updatedRow.zip,
  });
  if (locationEditInput) {
    subJobs.push(
      locationFetcher.update({
        gid: locationGid,
        editInput: locationEditInput,
      })
    );
  } else {
    subJobs.push(undefined);
  }

  if (metafieldKeyValueSets.length) {
    subJobs.push(
      updateAndFormatResourceMetafieldsGraphQl(
        {
          ownerGid: locationGid,
          metafieldKeyValueSets,
        },
        context
      )
    );
  } else {
    subJobs.push(undefined);
  }

  const [graphQlResponse, metafields] = (await Promise.all(subJobs)) as [
    // TODO: better typing
    GraphQlFetchTadaResponse<typeof editLocationMutation>,
    { [key: string]: any }
  ];
  if (graphQlResponse?.body?.data?.locationEdit?.location) {
    obj = {
      ...obj,
      ...locationFetcher.formatApiToRow(
        readFragment(locationFragment, graphQlResponse.body.data.locationEdit.location)
      ),
    };
  }
  if (metafields) {
    obj = {
      ...obj,
      ...metafields,
    };
  }
  return obj;
}
// #endregion

// #region GraphQl requests
export const fetchLocationsGraphQl = async (
  variables: VariablesOf<typeof getLocationsQuery>,
  context: coda.ExecutionContext,
  requestOptions: FetchRequestOptions = {}
) => {
  const payload = {
    query: printGql(getLocationsQuery),
    variables,
  };

  const { response } = await makeGraphQlRequest<typeof getLocationsQuery>(
    { ...requestOptions, payload, cacheTtlSecs: requestOptions.cacheTtlSecs ?? CACHE_DEFAULT },
    context
  );
  return response;
};

// #endregion
