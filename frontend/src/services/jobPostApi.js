import { getApiBase } from 'src/config/api';
import { getStoredAccessToken } from 'src/services/authApi';
import { buildListQuery, toListQueryParams } from 'src/utils/listQuery';

function formatValidationDetail(detail) {
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry === 'object') {
          const loc = Array.isArray(entry.loc) ? entry.loc.join('.') : '';
          const msg = entry.msg || JSON.stringify(entry);
          return loc ? `${loc}: ${msg}` : msg;
        }
        return String(entry);
      })
      .join('; ');
  }
  return JSON.stringify(detail);
}

async function parseError(response) {
  let detail = `Request failed (${response.status})`;
  try {
    const body = await response.json();
    if (body.detail) {
      detail = formatValidationDetail(body.detail);
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

export function listJobPosts(options = {}) {
  const params = toListQueryParams(options);
  return request(`/api/job-posts${buildListQuery(params)}`).then(asListEnvelope);
}

export async function listAllJobPosts(options = {}) {
  const result = await listJobPosts({ page: 1, pageSize: 200, ...options });
  return result.items || [];
}

export function createJobPost(payload) {
  return request('/api/job-posts', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateJobPost(postId, payload) {
  return request(`/api/job-posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteJobPost(postId) {
  return request(`/api/job-posts/${postId}`, {
    method: 'DELETE'
  });
}

export function batchAssignPostsToProfile(profileId, postIds) {
  return request('/api/job-posts/batch-assign-applications', {
    method: 'POST',
    body: JSON.stringify({
      profile_id: Number(profileId),
      post_ids: postIds.map((id) => Number(id))
    })
  });
}
