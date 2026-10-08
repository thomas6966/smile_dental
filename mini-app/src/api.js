import { initData } from './telegram.js';

// Vercel'da backend boshqa manzilda (Render) turadi; kompyuterda esa bo'sh — o'sha server
const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Serverda saqlangan rasmlar uchun to'liq manzil
export function assetUrl(url) {
  if (!url) return '';
  return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

export class ApiError extends Error {
  constructor(code, message, status = 0, data = {}) {
    super(message || code);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/client${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData(),
        'ngrok-skip-browser-warning': '1',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('NETWORK');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || 'ERROR', data.message, response.status, data);
  }
  return data;
}
