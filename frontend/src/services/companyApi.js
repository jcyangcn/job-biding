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

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function listCompanies(options = {}) {
  const params = toListQueryParams(options);
  return request(`/api/companies${buildListQuery(params)}`).then(asListEnvelope);
}

export async function listAllCompanies(options = {}) {
  const result = await listCompanies({ page: 1, pageSize: 200, ...options });
  return result.items || [];
}

export function createCompany(payload) {
  return request('/api/companies', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateCompany(companyId, payload) {
  return request(`/api/companies/${companyId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteCompany(companyId) {
  return request(`/api/companies/${companyId}`, {
    method: 'DELETE'
  });
}
