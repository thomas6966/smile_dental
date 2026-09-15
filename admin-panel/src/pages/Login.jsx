import { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { api } from '../api.js';
import { Spinner } from '../ui.jsx';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api('/auth/login', { method: 'POST', body: { username, password } });
      onLogin(res.token, res.admin);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card stack" onSubmit={submit}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div className="login-logo">🦷</div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Admin Panel</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            Stomatologiya klinikasini boshqarish
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label htmlFor="login-username">Login</label>
          <input
            id="login-username"
            className="input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Parol</label>
          <div style={{ position: 'relative' }}>
            <input
              id="login-password"
              className="input"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: 44 }}
              required
            />
            <button
              type="button"
              className="icon-btn"
              style={{ position: 'absolute', right: 2, top: 1 }}
              onClick={() => setShow(!show)}
              aria-label="Parolni ko'rsatish"
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button className="btn btn-primary" style={{ height: 44, marginTop: 4 }} disabled={loading}>
          {loading ? <Spinner /> : <LogIn size={17} />} Kirish
        </button>
      </form>
    </div>
  );
}
