const STATIC_DEV_PORTS = new Set(['3000', '4173', '5000', '8080']);
const BACKEND_PORTS = new Set(['8000', '8001']);
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

  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;

    if (process.env.NODE_ENV === 'development' && STATIC_DEV_PORTS.has(port)) {
      return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
    }

    if (process.env.NODE_ENV === 'production') {
      // FastAPI (or reverse proxy) serves UI + /api on the same host/port.
      if (!port || BACKEND_PORTS.has(port)) {
        return '';
      }
      // Static preview servers (e.g. `serve -s build` on :3000) need the API host.
      if (STATIC_DEV_PORTS.has(port)) {
        return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
      }
      return '';
    }
  }

  return '';
}

export const API_BASE = getApiBase();
