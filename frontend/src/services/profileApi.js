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

async function request(path, options = {}) {
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}${path}`, {
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

export function listProfiles(options = {}) {
  const params = toListQueryParams(options);
  return request(`/api/job-profiles${buildListQuery(params)}`).then(asListEnvelope);
}

/** Fetch up to 200 profiles for dropdowns/sidebars. */
export async function listAllProfiles() {
  const result = await listProfiles({ page: 1, pageSize: 200 });
  return result.items || [];
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

export function uploadProfileDefaultResume(profileId, file) {
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${getApiBase()}/api/job-profiles/${profileId}/default-resume`, {
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

export async function downloadProfileDefaultResume(profileId, originalName) {
  const response = await fetch(`${getApiBase()}/api/job-profiles/${profileId}/default-resume`, {
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = originalName || 'resume.pdf';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
