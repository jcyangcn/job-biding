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

export function listCitizens() {
  return requestJson('/api/citizens');
}

export function createCitizen(payload) {
  return requestJson('/api/citizens', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateCitizen(citizenId, payload) {
  return requestJson(`/api/citizens/${citizenId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteCitizen(citizenId) {
  return requestJson(`/api/citizens/${citizenId}`, {
    method: 'DELETE'
  });
}

export function uploadCitizenImage(citizenId, file) {
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${getApiBase()}/api/citizens/${citizenId}/images`, {
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

export function deleteCitizenImage(citizenId, filename) {
  return requestJson(
    `/api/citizens/${citizenId}/images/${encodeURIComponent(filename)}`,
    { method: 'DELETE' }
  );
}

export async function fetchCitizenImageBlob(citizenId, filename) {
  const response = await fetch(
    `${getApiBase()}/api/citizens/${citizenId}/images/${encodeURIComponent(filename)}`,
    { headers: authHeaders() }
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.blob();
}

export async function downloadCitizenImage(citizenId, filename, originalName) {
  const blob = await fetchCitizenImageBlob(citizenId, filename);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = originalName || filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
