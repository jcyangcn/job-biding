export function findAccessibleProfile(profiles, profileId) {
  const numericId = Number(profileId);
  if (!Number.isFinite(numericId)) {
    return null;
  }

  const rows = Array.isArray(profiles) ? profiles : [];
  return (
    rows.find(
      (row) => Number(row.id) === numericId && row.is_active !== false
    ) || null
  );
}
