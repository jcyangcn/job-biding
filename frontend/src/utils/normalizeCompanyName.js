export function normalizeCompanyName(name) {
  return String(name ?? '').toLowerCase().replace(/\s+/g, '');
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Return existing applications whose company matches `company` (case- and
 * space-insensitive). Pass `excludeId` to skip the application currently being
 * edited so it does not flag itself.
 */
export function findApplicationsWithSameCompany(
  company,
  applications = [],
  { excludeId } = {}
) {
  const normalized = normalizeCompanyName(company);
  if (!normalized) {
    return [];
  }
  return applications.filter((app) => {
    if (excludeId != null && Number(app.id) === Number(excludeId)) {
      return false;
    }
    return normalizeCompanyName(app.company) === normalized;
  });
}

/**
 * True when an existing application already has the same company, role, and
 * link. This is the only case that should block saving; a matching company
 * alone is just a (non-blocking) warning.
 */
export function isExactDuplicateApplication(
  { company, role, link },
  applications = [],
  { excludeId } = {}
) {
  const normalizedCompany = normalizeCompanyName(company);
  const normalizedRole = normalizeText(role);
  const normalizedLink = normalizeText(link);
  if (!normalizedCompany) {
    return false;
  }
  return applications.some((app) => {
    if (excludeId != null && Number(app.id) === Number(excludeId)) {
      return false;
    }
    return (
      normalizeCompanyName(app.company) === normalizedCompany &&
      normalizeText(app.role) === normalizedRole &&
      normalizeText(app.link) === normalizedLink
    );
  });
}
