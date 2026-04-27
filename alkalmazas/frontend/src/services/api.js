import { translateApiErrorMessage } from './errorMessages.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

/** Összefűzi a relatív útvonalat a konfigurált API alappal. */
function joinUrl(path) {
  if (!path.startsWith('/')) return `${API_BASE}/${path}`;
  return `${API_BASE}${path}`;
}

/**
 * Egységesen feldolgozza a backend válaszát, és a hibákat magyar felhasználói üzenetté alakítja.
 */
async function parseResponse(response) {
  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (contentType.includes('application/json')) {
        const error = new Error('A szerver JSON választ ígért, de a válasz nem volt feldolgozható.');
        error.status = response.status;
        error.data = text;
        throw error;
      }
      const error = new Error('A szerver nem JSON választ adott. Valószínűleg hibás frontend útvonal vagy backend végpont került meghívásra.');
      error.status = response.status;
      error.data = text;
      throw error;
    }
  }

  if (!response.ok) {
    const rawMessage = data?.error || data?.message || 'Ismeretlen hiba történt.';
    const error = new Error(translateApiErrorMessage(rawMessage, response.status));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function apiRequest(path, { method = 'GET', body, token, headers = {} } = {}) {
  const response = await fetch(joinUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseResponse(response);
}

export const api = {
  get: (path, options = {}) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options = {}) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => apiRequest(path, { ...options, method: 'DELETE' }),
};
