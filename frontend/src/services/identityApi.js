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

function authHeaders() {
  const token = getStoredAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request(path, options = {}) {
  const response = await fetch(`${getApiBase()}${path}`, {
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

export function listIdentities() {
  return request('/api/job-identities');
}

export function createIdentity(payload) {
  return request('/api/job-identities', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateIdentity(identityId, payload) {
  return request(`/api/job-identities/${identityId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteIdentity(identityId) {
  return request(`/api/job-identities/${identityId}`, {
    method: 'DELETE'
  });
}
