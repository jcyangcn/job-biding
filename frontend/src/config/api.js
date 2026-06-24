const STATIC_DEV_PORTS = new Set(['3000', '4173', '5000', '8080']);
const DEFAULT_BACKEND_PORT = '8001';

function normalizeBase(url) {
  if (url === undefined || url === null) return '';
  return String(url).trim().replace(/\/$/, '');
}

export function getApiBase() {
  if (typeof window !== 'undefined') {
    const runtime = window.APP_CONFIG?.apiUrl;
    if (runtime !== undefined && runtime !== null && String(runtime).trim() !== '') {
      return normalizeBase(runtime);
    }
  }

  const builtIn = normalizeBase(process.env.REACT_APP_API_URL);
  if (builtIn) return builtIn;

  // Production build served by a static dev server (e.g. `serve -s build` on :3000)
  // while FastAPI runs on :8001 — CRA proxy does not exist in production builds.
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    const { hostname, port, protocol } = window.location;
    if (STATIC_DEV_PORTS.has(port)) {
      return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
    }
  }

  return '';
}

export const API_BASE = getApiBase();
