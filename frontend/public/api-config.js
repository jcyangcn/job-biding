// Optional runtime API override (edit after build without rebuilding).
// Leave empty when FastAPI serves both the UI and /api on the same host/port.
window.APP_CONFIG = window.APP_CONFIG || {
  apiUrl: ''
};
