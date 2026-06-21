const API_BASE = process.env.REACT_APP_API_URL || '';

async function fetchText(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return res.text();
}

async function fetchJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return res.json();
}

function filenameFromDisposition(header) {
  if (!header) return 'resume.pdf';
  const match = /filename="?([^";\n]+)"?/.exec(header);
  return match ? match[1] : 'resume.pdf';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
  const res = await fetch(`${API_BASE}/api/resumes/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) {
        detail =
          typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const blob = await res.blob();
  const filename = filenameFromDisposition(res.headers.get('Content-Disposition'));
  downloadBlob(blob, filename);
  const generationIdHeader = res.headers.get('X-Generation-Id');
  const generationId = generationIdHeader ? Number(generationIdHeader) : null;
  return { filename, generationId };
}
