import { getApiBase } from 'src/config/api';
import { getStoredAccessToken } from 'src/services/authApi';

export async function verifyImportExportPassword(password) {
  const token = getStoredAccessToken();
  const response = await fetch(`${getApiBase()}/api/import-export/verify-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ password })
  });

  if (!response.ok) {
    let message = 'Password verification failed';
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.json();
}
