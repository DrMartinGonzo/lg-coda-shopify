// #region Imports

import { PartialBy } from '../../types/utilities';
import { safeToFloat, safeToString } from '../../utils/helpers';
import { CustomerAddressApiData } from '../rest/CustomerModel';
import { AddressApiData } from '../rest/OrderModel';
// #endregion

export function formatAddressToRow(data: AddressApiData) {
  if (!data) return null;
  const { latitude, longitude, ...address } = data;
  return {
    display: formatAddressDisplayName(address),
    latitude: latitude ? safeToFloat(latitude) : null,
    longitude: longitude ? safeToFloat(longitude) : null,
    ...address,
  };
}
export function formatRowAddressToApi(
  rowData: PartialBy<ReturnType<typeof formatAddressToRow>, 'latitude' | 'longitude'>
): AddressApiData {
  if (!rowData) return null;
  const { display, latitude, longitude, ...address } = rowData;
  return {
    ...address,
    latitude: latitude ? safeToString(latitude) : null,
    longitude: longitude ? safeToString(longitude) : null,
  };
}

export function formatCustomerAddressToRow(data: CustomerAddressApiData) {
  if (!data) return null;
  // we don't want to keep customer_id prop in address
  const { customer_id, ...addressWithoutCustomerId } = data;
  return {
    display: formatAddressDisplayName(addressWithoutCustomerId),
    ...addressWithoutCustomerId,
  };
}
export function formatCustomerRowAddressToApi(
  rowData: ReturnType<typeof formatCustomerAddressToRow>,
  customer_id?: number
): CustomerAddressApiData {
  if (!rowData) return null;
  const { display, ...address } = rowData;
  return {
    ...address,
    customer_id,
  };
}

export function formatPersonDisplayValue(person: {
  id: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  if (person.firstName || person.lastName) {
    return [person.firstName, person.lastName].filter((p) => p && p !== '').join(' ');
  } else if (person.email) {
    return person.email;
  }
  return person.id.toString();
}

function formatAddressDisplayName(address, withName = true, withCompany = true) {
  const parts = [
    withName ? [address?.first_name, address?.last_name].filter((p) => p && p !== '').join(' ') : undefined,
    withCompany ? address?.company : undefined,
    address?.address1,
    address?.address2,
    address?.city,
    address?.country,
  ];

  return parts.filter((part) => part && part !== '').join(', ');
}
