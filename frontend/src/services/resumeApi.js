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

function filenameFromDisposition(header) {
  if (!header) return 'resume.pdf';

  const utf8Match = /filename\*=UTF-8''([^;\n]+)/i.exec(header);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      /* fall through */
    }
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(header);
  if (quotedMatch) return quotedMatch[1];

  const plainMatch = /filename=([^;\n]+)/i.exec(header);
  if (plainMatch) return plainMatch[1].trim();

  return 'resume.pdf';
}

function isPdfBuffer(buffer) {
  if (!buffer || buffer.byteLength < 4) return false;
  const header = new TextDecoder().decode(buffer.slice(0, 4));
  return header === '%PDF';
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
          'API request returned HTML instead of a PDF. Check REACT_APP_API_URL or public/api-config.js points to the FastAPI backend.';
      } else if (text) {
        detail = text.slice(0, 240);
      }
    }
  } catch {
    /* ignore */
  }
  return detail;
}

function downloadBlob(blob, filename) {
  const safeName = (filename || 'resume.pdf').replace(/[\\/:*?"<>|]+/g, '_');
  const pdfBlob =
    blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && navigator.msSaveOrOpenBlob) {
    navigator.msSaveOrOpenBlob(pdfBlob, safeName);
    return;
  }

  const url = URL.createObjectURL(pdfBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);

  requestAnimationFrame(() => {
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
  const res = await fetch(`${getApiBase()}/api/resumes/pdf`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(await readErrorDetail(res));
  }

  const buffer = await res.arrayBuffer();
  if (!isPdfBuffer(buffer)) {
    throw new Error(
      'Server response was not a PDF. In production builds, set REACT_APP_API_URL or edit public/api-config.js so API calls reach the FastAPI backend.'
    );
  }

  const blob = new Blob([buffer], { type: 'application/pdf' });
  const filename = filenameFromDisposition(res.headers.get('Content-Disposition'));
  downloadBlob(blob, filename);
  const generationIdHeader = res.headers.get('X-Generation-Id');
  const generationId = generationIdHeader ? Number(generationIdHeader) : null;
  return { filename, generationId };
}
