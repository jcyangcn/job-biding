import { getApiBase } from 'src/config/api';
import { getStoredAccessToken } from 'src/services/authApi';
import { buildListQuery, toListQueryParams } from 'src/utils/listQuery';

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

function asListEnvelope(body) {
  if (Array.isArray(body)) {
    return { items: body, total: body.length, page: 1, page_size: body.length };
  }
  return body;
}

async function request(path, options = {}) {
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}${path}`, {
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

export function listIdentities(options = {}) {
  const params = toListQueryParams(options);
  return request(`/api/job-identities${buildListQuery(params)}`).then(asListEnvelope);
}

/** Fetch up to 200 identities for dropdowns. */
export async function listAllIdentities() {
  const result = await listIdentities({ page: 1, pageSize: 200 });
  return result.items || [];
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
