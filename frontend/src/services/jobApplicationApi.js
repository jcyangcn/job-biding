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

export function listJobApplications(profileId, options = {}) {
  const params = new URLSearchParams();
  if (profileId !== undefined && profileId !== null && profileId !== '') {
    params.set('profile_id', String(profileId));
  }
  if (options.includeJobDescription) {
    params.set('include_job_description', 'true');
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetch(`${getApiBase()}/api/job-applications${query}`, {
    headers: authHeaders()
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function listJobApplicationPostIds({
  profileId,
  bidderUserId,
  dateFrom,
  dateTo,
  withoutProfile
} = {}) {
  const params = new URLSearchParams();
  if (profileId !== undefined && profileId !== null && profileId !== '') {
    params.set('profile_id', String(profileId));
  }
  if (bidderUserId !== undefined && bidderUserId !== null && bidderUserId !== '') {
    params.set('bidder_user_id', String(bidderUserId));
  }
  if (dateFrom) {
    params.set('date_from', dateFrom);
  }
  if (dateTo) {
    params.set('date_to', dateTo);
  }
  if (withoutProfile) {
    params.set('without_profile', 'true');
  }

  return fetch(`${getApiBase()}/api/job-applications/post-ids?${params.toString()}`, {
    headers: authHeaders()
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function getJobApplication(applicationId) {
  return fetch(`${getApiBase()}/api/job-applications/${applicationId}`, {
    headers: authHeaders()
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function createJobApplication(payload) {
  return fetch(`${getApiBase()}/api/job-applications`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function updateJobApplication(applicationId, payload) {
  return fetch(`${getApiBase()}/api/job-applications/${applicationId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function deleteJobApplication(applicationId) {
  return fetch(`${getApiBase()}/api/job-applications/${applicationId}`, {
    method: 'DELETE',
    headers: authHeaders()
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function approveJobApplications(applicationIds) {
  return fetch(`${getApiBase()}/api/job-applications/bulk-approve`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ application_ids: applicationIds })
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

function authHeadersWithoutContentType() {
  const token = getStoredAccessToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function uploadApplicationScreenshot(applicationId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return fetch(`${getApiBase()}/api/job-applications/${applicationId}/screenshot`, {
    method: 'POST',
    headers: authHeadersWithoutContentType(),
    body: formData
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function deleteApplicationScreenshot(applicationId) {
  return fetch(`${getApiBase()}/api/job-applications/${applicationId}/screenshot`, {
    method: 'DELETE',
    headers: authHeaders()
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function fetchApplicationScreenshotBlob(applicationId, filename) {
  return fetch(
    `${getApiBase()}/api/job-applications/${applicationId}/screenshot/${encodeURIComponent(filename)}`,
    {
      headers: authHeadersWithoutContentType()
    }
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.blob();
  });
}

export async function persistApplicationScreenshotChanges(
  applicationId,
  { pendingFile, removeExisting }
) {
  if (removeExisting) {
    await deleteApplicationScreenshot(applicationId);
  }
  if (pendingFile) {
    await uploadApplicationScreenshot(applicationId, pendingFile);
  }
}
