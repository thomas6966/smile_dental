class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const str = (value, max = 1000) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
};

const optStr = (value, max = 1000) => {
  const s = str(value, max);
  return s || null;
};

const int = (value, def = null) => {
  if (value === undefined || value === null || value === '') return def;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : def;
};

const float = (value, def = null) => {
  if (value === undefined || value === null || value === '') return def;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : def;
};

const bool = (value, def = false) => {
  if (value === undefined || value === null || value === '') return def;
  return value === true || value === 'true' || value === 1 || value === '1' || value === 'on';
};

const idParam = (req, name = 'id') => {
  const id = int(req.params[name]);
  if (!id || id < 1) throw new HttpError(400, "Noto'g'ri ID");
  return id;
};

module.exports = { HttpError, str, optStr, int, float, bool, idParam };
