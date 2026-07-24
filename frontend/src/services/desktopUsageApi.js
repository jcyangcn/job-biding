import { getApiBase } from 'src/config/api';
import { getStoredAccessToken } from 'src/services/authApi';

async function parseError(response) {
  let detail = `Request failed (${response.status})`;
  try {
    const body = await response.json();
    if (body.detail) {
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    }
  } catch {
    /* ignore */
  }
  return detail;
}

function authHeaders(extra = {}) {
  const token = getStoredAccessToken();
  const headers = { ...extra };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchUserUsageAnalytics(userId, { days = 14 } = {}) {
  const response = await fetch(
    `${getApiBase()}/api/desktop-usage/users/${userId}/analytics?days=${days}`,
    { headers: authHeaders() }
  );
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json();
}

export function getDesktopScreenshotUrl(screenshotId) {
  const token = getStoredAccessToken();
  const base = `${getApiBase()}/api/desktop-usage/screenshots/${screenshotId}`;
  // Browser <img> can't set Authorization; use blob fetch in UI instead.
  return { url: base, token };
}

export async function fetchDesktopScreenshotBlob(screenshotId) {
  const { url, token } = getDesktopScreenshotUrl(screenshotId);
  const response = await fetch(url, {
    headers: authHeaders()
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.blob();
}
