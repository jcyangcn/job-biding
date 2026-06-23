import { getStoredAccessToken } from 'src/services/authApi';

const API_BASE = process.env.REACT_APP_API_URL || '';

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

function authHeaders() {
  const token = getStoredAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function listProgressionEmails(profileId) {
  const query =
    profileId === undefined || profileId === null || profileId === ''
      ? ''
      : `?profile_id=${profileId}`;
  return fetch(`${API_BASE}/api/job-progression-emails${query}`, {
    headers: authHeaders()
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function previewProgressionEmailReference(profileId) {
  return fetch(
    `${API_BASE}/api/job-progression-emails/next-reference?profile_id=${profileId}`,
    { headers: authHeaders() }
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function createProgressionEmail(payload) {
  return fetch(`${API_BASE}/api/job-progression-emails`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function updateProgressionEmail(emailId, payload) {
  return fetch(`${API_BASE}/api/job-progression-emails/${emailId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function deleteProgressionEmail(emailId) {
  return fetch(`${API_BASE}/api/job-progression-emails/${emailId}`, {
    method: 'DELETE',
    headers: authHeaders()
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}
