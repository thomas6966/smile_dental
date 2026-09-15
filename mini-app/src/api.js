import { initData } from './telegram.js';

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
    response = await fetch(`/api/client${path}`, {
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
