export interface LookupPerson {
  id: string;
  fullName: string;
}

const normalizeLookupValue = (value: unknown) =>
  String(value ?? '').trim().toLocaleLowerCase('vi');

export const formatPersonLookupValue = (person: LookupPerson) =>
  `${person.fullName} (${person.id})`;

export const findPersonByIdOrName = <T extends LookupPerson>(
  people: T[],
  query: string
): T | undefined => {
  const normalizedQuery = normalizeLookupValue(query);
  if (!normalizedQuery) return undefined;

  return people.find(person => {
    const id = normalizeLookupValue(person.id);
    const name = normalizeLookupValue(person.fullName);
    return normalizedQuery === id ||
      normalizedQuery === name ||
      normalizedQuery === normalizeLookupValue(formatPersonLookupValue(person));
  });
};