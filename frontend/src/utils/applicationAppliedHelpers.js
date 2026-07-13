import { format } from 'date-fns';

export function currentAppliedTimestamp(existing = '') {
  return existing || format(new Date(), 'yyyy-MM-dd HH:mm');
}

export function resolveAppliedFromEvidence({ successLink, hasScreenshot, appliedAt }) {
  const hasLink = Boolean(String(successLink || '').trim());
  if (hasLink || hasScreenshot) {
    return {
      applied: true,
      applied_at: currentAppliedTimestamp(appliedAt)
    };
  }
  return {
    applied: false,
    applied_at: ''
  };
}

export function hasAppliedEvidence({ successLink, pendingScreenshotFile, existingScreenshot, removeExistingScreenshot }) {
  const hasScreenshot = Boolean(
    pendingScreenshotFile || (existingScreenshot && !removeExistingScreenshot)
  );
  const hasLink = Boolean(String(successLink || '').trim());
  return hasScreenshot || hasLink;
}
