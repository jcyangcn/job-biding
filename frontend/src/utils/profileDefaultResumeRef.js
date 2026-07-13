const PROFILE_DEFAULT_RESUME_PREFIX = 'profile-default-resume:';

export function buildProfileDefaultResumeRef(profileId, filename) {
  return `${PROFILE_DEFAULT_RESUME_PREFIX}${profileId}:${encodeURIComponent(filename || '')}`;
}

export function parseProfileDefaultResumeRef(value) {
  const text = String(value || '').trim();
  if (!text.startsWith(PROFILE_DEFAULT_RESUME_PREFIX)) {
    return null;
  }

  const rest = text.slice(PROFILE_DEFAULT_RESUME_PREFIX.length);
  const colon = rest.indexOf(':');
  if (colon < 0) {
    return null;
  }

  const profileId = Number(rest.slice(0, colon));
  if (!Number.isFinite(profileId) || profileId <= 0) {
    return null;
  }

  let filename = '';
  try {
    filename = decodeURIComponent(rest.slice(colon + 1));
  } catch {
    filename = rest.slice(colon + 1);
  }

  return { profileId, filename: filename || 'resume.pdf' };
}
