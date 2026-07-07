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

async function requestJson(path, options = {}) {
  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      ...authHeaders({ 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function listLinkedInAccounts() {
  return requestJson('/api/linkedin-accounts');
}

export function createLinkedInAccount(payload) {
  return requestJson('/api/linkedin-accounts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateLinkedInAccount(accountId, payload) {
  return requestJson(`/api/linkedin-accounts/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteLinkedInAccount(accountId) {
  return requestJson(`/api/linkedin-accounts/${accountId}`, {
    method: 'DELETE'
  });
}

export function uploadLinkedInImage(accountId, file) {
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${getApiBase()}/api/linkedin-accounts/${accountId}/image`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function deleteLinkedInImage(accountId) {
  return requestJson(`/api/linkedin-accounts/${accountId}/image`, {
    method: 'DELETE'
  });
}

export async function fetchLinkedInImageBlob(accountId, filename) {
  const response = await fetch(
    `${getApiBase()}/api/linkedin-accounts/${accountId}/image/${encodeURIComponent(filename)}`,
    { headers: authHeaders() }
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.blob();
}
