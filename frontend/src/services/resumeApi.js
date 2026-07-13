import { getApiBase } from 'src/config/api';
import { getStoredAccessToken } from 'src/services/authApi';
import { buildListQuery, toListQueryParams } from 'src/utils/listQuery';

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getStoredAccessToken();
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

async function fetchText(path) {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return res.text();
}

async function fetchJson(path) {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return res.json();
}

function sanitizePdfFilename(filename) {
  let safeName = (filename || 'resume.pdf').replace(/[\\/:*?"<>|]+/g, '_').trim();
  if (!safeName) safeName = 'resume.pdf';
  if (!/\.pdf$/i.test(safeName)) safeName = `${safeName}.pdf`;
  return safeName;
}

function buildResumeDownloadUrl(filename) {
  const safeName = sanitizePdfFilename(filename);
  return `${getApiBase()}/api/resumes/download/${encodeURIComponent(safeName)}`;
}

export function getResumeDownloadUrl(filename) {
  return buildResumeDownloadUrl(filename);
}

export function getResumeInlineUrl(filename) {
  return `${buildResumeDownloadUrl(filename)}?inline=true`;
}

async function readErrorDetail(res) {
  let detail = `Request failed (${res.status})`;
  try {
    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const err = await res.json();
      if (err.detail) {
        detail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      }
    } else {
      const text = (await res.text()).trim();
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        detail =
          'API request returned HTML instead of JSON. Check REACT_APP_API_URL or public/api-config.js points to the FastAPI backend.';
      } else if (text) {
        detail = text.slice(0, 240);
      }
    }
  } catch {
    /* ignore */
  }
  return detail;
}

function parseContentDispositionFilename(headerValue) {
  if (!headerValue) return null;
  const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }
  const plainMatch = headerValue.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || null;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = sanitizePdfFilename(filename);
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function fetchResumePdfBlob(filename, { inline = false } = {}) {
  const safeName = sanitizePdfFilename(filename);
  const url = inline ? getResumeInlineUrl(safeName) : buildResumeDownloadUrl(safeName);
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }

  const blob = await response.blob();
  const pdfBlob =
    blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  const resolvedName =
    sanitizePdfFilename(
      parseContentDispositionFilename(response.headers.get('Content-Disposition')) || safeName
    );

  return { blob: pdfBlob, filename: resolvedName };
}

export async function downloadResumePdf(filename) {
  const { blob, filename: resolvedName } = await fetchResumePdfBlob(filename);
  downloadBlob(blob, resolvedName);
  return resolvedName;
}

/** @deprecated Prefer downloadResumePdf — kept for callers expecting fire-and-forget. */
export function triggerResumeDownload(filename) {
  downloadResumePdf(filename).catch(() => {
    /* caller may not await; errors surface when using downloadResumePdf */
  });
}

export async function loadDefaultJd() {
  return fetchText('/api/jd/default');
}

export async function loadDefaultProfileMarkdown() {
  return fetchText('/api/profile/default/markdown');
}

export async function loadDefaultProfileJson() {
  return fetchJson('/api/profile/default');
}

export function listResumeGenerations(options = {}) {
  const params = toListQueryParams(options);
  return fetchJson(`/api/resume-generations${buildListQuery(params)}`).then(asListEnvelope);
}

export async function listAllResumeGenerations(options = {}) {
  const result = await listResumeGenerations({ page: 1, pageSize: 200, ...options });
  return result.items || [];
}

export async function fetchHealth() {
  return fetchJson('/health');
}

export function buildResumeRequest({
  jobDescription,
  profileMode,
  profileMarkdown,
  profileJson,
  profileId,
  applicationId
}) {
  const trimmedJobDescription = jobDescription.trim();
  if (trimmedJobDescription.length < 50) {
    throw new Error('Job description must be at least 50 characters.');
  }

  const body = { job_description: trimmedJobDescription };

  if (profileId != null && profileId !== '') {
    body.profile_id = Number(profileId);
  }

  if (applicationId != null && applicationId !== '') {
    body.application_id = Number(applicationId);
  }

  if (profileMode === 'markdown') {
    const md = profileMarkdown.trim();
    if (!md) throw new Error('Enter profile markdown.');
    body.profile_markdown = md;
  } else {
    const raw = profileJson.trim();
    if (!raw) throw new Error('Enter profile JSON.');
    try {
      body.profile = JSON.parse(raw);
    } catch {
      throw new Error('Profile JSON is invalid.');
    }
  }

  return body;
}

export async function generateResumePdf(body) {
  const res = await fetch(`${getApiBase()}/api/resumes`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(await readErrorDetail(res));
  }

  const meta = await res.json();
  const filename = sanitizePdfFilename(meta.filename);
  await downloadResumePdf(filename);

  const generationId =
    meta.generation_id != null && meta.generation_id !== ''
      ? Number(meta.generation_id)
      : null;

  return {
    filename,
    generationId,
    download: () => downloadResumePdf(filename)
  };
}

export async function matchBestResume({ profileId, jobVector }) {
  const res = await fetch(`${getApiBase()}/api/resumes/match-best`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      profile_id: Number(profileId),
      job_vector: Array.isArray(jobVector) ? jobVector : []
    })
  });

  if (!res.ok) {
    throw new Error(await readErrorDetail(res));
  }

  const generationIdHeader = res.headers.get('X-Generation-Id');
  const scoreHeader = res.headers.get('X-Match-Score');
  const profileIdHeader = res.headers.get('X-Profile-Id');
  const filename =
    sanitizePdfFilename(
      parseContentDispositionFilename(res.headers.get('Content-Disposition')) ||
        'resume.pdf'
    );

  const blob = await res.blob();
  const pdfBlob =
    blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  downloadBlob(pdfBlob, filename);

  return {
    filename,
    generationId:
      generationIdHeader != null && generationIdHeader !== ''
        ? Number(generationIdHeader)
        : null,
    score: scoreHeader != null && scoreHeader !== '' ? Number(scoreHeader) : null,
    profileId:
      profileIdHeader != null && profileIdHeader !== ''
        ? Number(profileIdHeader)
        : Number(profileId),
    download: () => downloadBlob(pdfBlob, filename)
  };
}
