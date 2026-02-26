import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { FormField } from '../components/FormField';
import './AuthPage.css';

export function LoginPage({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await authApi.login(form);
      const me = await authApi.me();
      onAuth(me.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <h2>Login</h2>
        {error && <p className="error-text">{error}</p>}
        <FormField label="Benutzername" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <label className="password-field">
          <span>Passwort</span>
          <div className="password-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button type="button" className="toggle-btn" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? 'Verbergen' : 'Anzeigen'}
            </button>
          </div>
        </label>
        <button type="submit" className="primary-btn">Anmelden</button>
        <p>
          Kein Konto? <Link to="/register">Registrieren</Link>
        </p>
      </form>
    </div>
  );
}
