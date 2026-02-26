import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { FormField } from '../components/FormField';
import './AuthPage.css';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await authApi.register(form);
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <h2>Registrierung</h2>
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
        <button type="submit" className="primary-btn">Konto erstellen</button>
        <p>
          Bereits Konto? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
