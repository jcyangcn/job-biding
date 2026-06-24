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

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function listUsers() {
  return request('/api/users');
}

export function createUser(payload) {
  return request('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateUser(userId, payload) {
  return request(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteUser(userId) {
  return request(`/api/users/${userId}`, {
    method: 'DELETE'
  });
}
