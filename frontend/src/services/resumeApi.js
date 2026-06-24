import { getApiBase } from 'src/config/api';
import { getStoredAccessToken } from 'src/services/authApi';

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getStoredAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
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

/**
 * Trigger a direct browser download via the server attachment response.
 * Uses a hidden iframe so the current page stays open (including cross-origin API).
 */
export function triggerResumeDownload(filename) {
  const safeName = sanitizePdfFilename(filename);
  const downloadUrl = buildResumeDownloadUrl(safeName);
  const frameName = `resume-download-${Date.now()}`;

  const iframe = document.createElement('iframe');
  iframe.name = frameName;
  iframe.style.display = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.target = frameName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    iframe.remove();
  }, 60_000);
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

export async function loadDefaultJd() {
  return fetchText('/api/jd/default');
}

export async function loadDefaultProfileMarkdown() {
  return fetchText('/api/profile/default/markdown');
}

export async function loadDefaultProfileJson() {
  return fetchJson('/api/profile/default');
}

export async function listResumeGenerations(limit = 50) {
  return fetchJson(`/api/resume-generations?limit=${limit}`);
}

export async function fetchHealth() {
  return fetchJson('/health');
}

export function buildResumeRequest({ jobDescription, profileMode, profileMarkdown, profileJson }) {
  const trimmedJobDescription = jobDescription.trim();
  if (trimmedJobDescription.length < 50) {
    throw new Error('Job description must be at least 50 characters.');
  }

  const body = { job_description: trimmedJobDescription };

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
  triggerResumeDownload(filename);

  const generationId =
    meta.generation_id != null && meta.generation_id !== ''
      ? Number(meta.generation_id)
      : null;

  return {
    filename,
    generationId,
    download: () => triggerResumeDownload(filename)
  };
}
