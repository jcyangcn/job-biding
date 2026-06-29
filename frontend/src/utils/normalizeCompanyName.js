export function normalizeCompanyName(name) {
  return String(name ?? '').toLowerCase().replace(/\s+/g, '');
}

export function isDuplicateCompanyName(inputCompany, existingCompanies) {
  const normalized = normalizeCompanyName(inputCompany);
  if (!normalized) {
    return false;
  }
  return existingCompanies.some(
    (company) => normalizeCompanyName(company) === normalized
  );
}
