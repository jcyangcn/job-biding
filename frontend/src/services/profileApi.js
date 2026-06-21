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

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function listProfiles() {
  return request('/api/job-profiles');
}

export function createProfile(payload) {
  return request('/api/job-profiles', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateProfile(profileId, payload) {
  return request(`/api/job-profiles/${profileId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteProfile(profileId) {
  return request(`/api/job-profiles/${profileId}`, {
    method: 'DELETE'
  });
}
