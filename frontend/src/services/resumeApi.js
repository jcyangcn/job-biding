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

function copyPdfBuffer(buffer) {
  return buffer.slice(0);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const PDF_SAVE_TYPES = [
  {
    description: 'PDF document',
    accept: { 'application/pdf': ['.pdf'] }
  }
];

function validatePdfBuffer(buffer) {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Generated PDF is empty');
  }

  const header = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  const signature = String.fromCharCode(...header);
  if (signature !== '%PDF') {
    throw new Error('Generated file is not a valid PDF');
  }
}

function createPdfBlob(buffer) {
  return new Blob([copyPdfBuffer(buffer)], { type: 'application/pdf' });
}

async function writeBytesToFileHandle(handle, bytes) {
  const writable = await handle.createWritable({ keepExistingData: false });
  try {
    await writable.write(bytes);
    await writable.close();
  } catch (err) {
    try {
      await writable.abort();
    } catch {
      /* ignore */
    }
    throw err;
  }

  return handle.name;
}

async function saveWithFilePicker(bytes, filename) {
  const handle = await window.showSaveFilePicker({
    suggestedName: filename,
    types: PDF_SAVE_TYPES
  });
  const savedName = await writeBytesToFileHandle(handle, bytes);
  return { filename: savedName || filename, saved: true, cancelled: false, method: 'picker' };
}

async function saveWithDirectoryPicker(bytes, filename) {
  const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const savedName = await writeBytesToFileHandle(fileHandle, bytes);
  return { filename: savedName || filename, saved: true, cancelled: false, method: 'folder' };
}

/** Save using browser download (enable “Ask where to save” in browser for Save As). */
export function downloadResumePdfBuffer(buffer, filename = 'resume.pdf') {
  const pdfBytes = copyPdfBuffer(buffer);
  validatePdfBuffer(pdfBytes);
  downloadBlob(createPdfBlob(pdfBytes), filename);
  return { filename, saved: true, cancelled: false, method: 'download' };
}

/** Call on a fresh button click right before writing the PDF bytes. */
export async function saveResumePdfBuffer(buffer, filename = 'resume.pdf') {
  const pdfBytes = copyPdfBuffer(buffer);
  validatePdfBuffer(pdfBytes);
  const blob = createPdfBlob(pdfBytes);

  const canPickFile = typeof window.showSaveFilePicker === 'function';
  const canPickFolder = typeof window.showDirectoryPicker === 'function';

  if (canPickFile) {
    try {
      return await saveWithFilePicker(pdfBytes, filename);
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { filename, saved: false, cancelled: true };
      }

      if (canPickFolder) {
        try {
          return await saveWithDirectoryPicker(pdfBytes, filename);
        } catch (folderErr) {
          if (folderErr?.name === 'AbortError') {
            return { filename, saved: false, cancelled: true };
          }
        }
      }
    }
  }

  downloadBlob(blob, filename);
  return {
    filename,
    saved: true,
    cancelled: false,
    method: 'download',
    usedFallback: canPickFile
  };
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

export async function fetchResumePdf(body) {
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

  const buffer = await res.arrayBuffer();
  validatePdfBuffer(buffer);
  const filename = filenameFromDisposition(res.headers.get('Content-Disposition'));
  const generationIdHeader = res.headers.get('X-Generation-Id');
  const generationId = generationIdHeader ? Number(generationIdHeader) : null;

  return { buffer: copyPdfBuffer(buffer), filename, generationId };
}

export async function generateResumePdf(body) {
  const { buffer, filename, generationId } = await fetchResumePdf(body);
  const saveResult = await saveResumePdfBuffer(buffer, filename);
  return {
    filename: saveResult.filename,
    generationId,
    saved: saveResult.saved
  };
}
