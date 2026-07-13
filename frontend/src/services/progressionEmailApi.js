import { getApiBase } from 'src/config/api';
import { getStoredAccessToken } from 'src/services/authApi';
import { EMPTY_FILTER_VALUE } from 'src/utils/tableListFilters';

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

function compareValues(left, right) {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
}

function paginateProgressionEmails(items, options = {}) {
  const search = (options.search || '').trim().toLowerCase();
  const filters = options.filters || {};
  const dateFrom = options.dateFrom ? new Date(options.dateFrom).getTime() : null;
  const dateTo = options.dateTo ? new Date(options.dateTo).getTime() : null;
  const sortBy = options.sortBy || 'email_date';
  const sortDir = options.sortDir === 'asc' ? 1 : -1;
  const page = Number(options.page) > 0 ? Number(options.page) : 1;
  const pageSize = Number(options.pageSize) > 0 ? Number(options.pageSize) : 10;

  let filtered = Array.isArray(items) ? items : [];

  if (search) {
    filtered = filtered.filter((row) => {
      const haystack = [
        row.reference_no,
        row.company,
        row.email_link,
        row.profile_label,
        row.log,
        row.type,
        row.status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  if (filters.type && filters.type !== EMPTY_FILTER_VALUE) {
    filtered = filtered.filter((row) => row.type === filters.type);
  }

  if (filters.status && filters.status !== EMPTY_FILTER_VALUE) {
    filtered = filtered.filter((row) => row.status === filters.status);
  }

  if (dateFrom != null) {
    filtered = filtered.filter((row) => {
      const value = new Date(row.email_date).getTime();
      return !Number.isNaN(value) && value >= dateFrom;
    });
  }

  if (dateTo != null) {
    filtered = filtered.filter((row) => {
      const value = new Date(row.email_date).getTime();
      return !Number.isNaN(value) && value <= dateTo;
    });
  }

  const sorted = [...filtered].sort((left, right) => {
    const result = compareValues(left[sortBy], right[sortBy]);
    return result * sortDir;
  });

  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  return {
    items: pageItems,
    total,
    page,
    page_size: pageSize
  };
}

async function fetchProgressionEmailRows(profileId) {
  const query =
    profileId === undefined || profileId === null || profileId === ''
      ? ''
      : `?profile_id=${profileId}`;
  const response = await fetch(`${getApiBase()}/api/job-progression-emails${query}`, {
    headers: authHeaders()
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const body = await response.json();
  if (Array.isArray(body)) {
    return body;
  }
  return body.items || [];
}

export function listProgressionEmails(profileId, options = {}) {
  return fetchProgressionEmailRows(profileId).then((items) =>
    paginateProgressionEmails(items, options)
  );
}

export async function listAllProgressionEmails(profileId, options = {}) {
  const rows = await fetchProgressionEmailRows(profileId);
  return paginateProgressionEmails(rows, {
    ...options,
    page: 1,
    pageSize: rows.length || 1
  }).items;
}

export function previewProgressionEmailReference(profileId) {
  return fetch(
    `${getApiBase()}/api/job-progression-emails/next-reference?profile_id=${profileId}`,
    { headers: authHeaders() }
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}

export function createProgressionEmail(payload) {
  return fetch(`${getApiBase()}/api/job-progression-emails`, {
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

export function updateProgressionEmail(emailId, payload) {
  return fetch(`${getApiBase()}/api/job-progression-emails/${emailId}`, {
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

export function deleteProgressionEmail(emailId) {
  return fetch(`${getApiBase()}/api/job-progression-emails/${emailId}`, {
    method: 'DELETE',
    headers: authHeaders()
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return response.json();
  });
}
