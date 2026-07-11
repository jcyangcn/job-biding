/**
 * Soft-merge resume status fields from a fresh API list into existing rows.
 * Keeps previous row object identity when nothing resume-related changed,
 * so open create/edit dialogs and table UI are not flushed.
 */
export function mergeApplicationResumeStatus(prevRows, nextRows) {
  const previous = Array.isArray(prevRows) ? prevRows : [];
  const next = Array.isArray(nextRows) ? nextRows : [];
  const nextById = new Map(next.map((row) => [row.id, row]));
  const prevIds = new Set(previous.map((row) => row.id));

  let changed = false;
  const merged = previous.map((row) => {
    const fresh = nextById.get(row.id);
    if (!fresh) {
      return row;
    }

    if (
      row.resume_generation_status === fresh.resume_generation_status &&
      row.resume_pdf_filename === fresh.resume_pdf_filename &&
      row.resume_generated_id === fresh.resume_generated_id
    ) {
      return row;
    }

    changed = true;
    return {
      ...row,
      resume_generation_status: fresh.resume_generation_status,
      resume_pdf_filename: fresh.resume_pdf_filename,
      resume_generated_id: fresh.resume_generated_id
    };
  });

  const additions = next.filter((row) => !prevIds.has(row.id));
  if (additions.length) {
    changed = true;
    return [...additions, ...merged];
  }

  return changed ? merged : previous;
}
