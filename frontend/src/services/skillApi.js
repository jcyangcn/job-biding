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

export function listSkills(options = {}) {
  const params = toListQueryParams(options);
  return request(`/api/skills${buildListQuery(params)}`).then(asListEnvelope);
}

export async function listAllSkills(options = {}) {
  const result = await listSkills({ page: 1, pageSize: 200, ...options });
  return result.items || [];
}

export async function listSkillKeywords(role) {
  const params = {};
  if (role) {
    params.role = role;
  }
  const body = await request(`/api/skills/keywords${buildListQuery(params)}`);
  return Array.isArray(body?.keywords) ? body.keywords : [];
}

export function createSkill(payload) {
  return request('/api/skills', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateSkill(skillId, payload) {
  return request(`/api/skills/${skillId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteSkill(skillId) {
  return request(`/api/skills/${skillId}`, {
    method: 'DELETE'
  });
}
