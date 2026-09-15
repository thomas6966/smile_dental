const TOKEN_KEY = 'clinic-admin-token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage mavjud emas
  }
}

export class ApiError extends Error {
  constructor(code, message, status = 0, data = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { 'ngrok-skip-browser-warning': '1' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`/api/admin${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError('NETWORK', "Server bilan aloqa yo'q. Dastur ishga tushirilganini tekshiring");
  }

  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== '/auth/login') {
    setToken(null);
    window.dispatchEvent(new Event('admin:logout'));
  }
  if (!response.ok) {
    throw new ApiError(data.error || 'ERROR', data.message || 'Xatolik yuz berdi', response.status, data);
  }
  return data;
}

export function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  const query = new URLSearchParams(entries).toString();
  return query ? `?${query}` : '';
}
