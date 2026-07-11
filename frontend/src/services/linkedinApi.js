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

function authHeaders(extra = {}) {
  const token = getStoredAccessToken();
  const headers = { ...extra };
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

export function listLinkedInAccounts(options = {}) {
  const params = toListQueryParams(options);
  return requestJson(`/api/linkedin-accounts${buildListQuery(params)}`).then(asListEnvelope);
}

export function fetchLinkedInAccountsSummary() {
  return requestJson('/api/linkedin-accounts/summary');
}

export function getLinkedInAccount(accountId) {
  return requestJson(`/api/linkedin-accounts/${accountId}`);
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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function parseContentDispositionFilename(headerValue) {
  if (!headerValue) return null;
  const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }
  const plainMatch = headerValue.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || null;
}

export async function exportLinkedInAccountsCsv() {
  const response = await fetch(`${getApiBase()}/api/linkedin-accounts/export`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const blob = await response.blob();
  const filename =
    parseContentDispositionFilename(response.headers.get('Content-Disposition')) ||
    `linkedin-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadBlob(blob, filename);
}

export async function importLinkedInAccountsCsv(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${getApiBase()}/api/linkedin-accounts/import`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}
