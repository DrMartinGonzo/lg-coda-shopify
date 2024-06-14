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

export function formatAddressDisplayName(address, withName = true, withCompany = true) {
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
