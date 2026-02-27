import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { FormField } from '../components/FormField';
import './AuthPage.css';

export function LoginPage({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showResetForm, setShowResetForm] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const checkResetStatus = async (usernameValue) => {
    const username = String(usernameValue || '').trim();
    if (!username) return;
    const status = await authApi.passwordResetStatus(username);
    if (status?.requires_reset) {
      const ok = window.confirm(`User "${username}" darf neues Passwort vergeben. Jetzt neues Passwort vergeben?`);
      if (ok) {
        setShowResetForm(true);
        setForm((prev) => ({ ...prev, username, password: '' }));
      }
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (showResetForm) {
      setError('Bitte zuerst ein neues Passwort vergeben.');
      return;
    }
    try {
      await authApi.login(form);
      const me = await authApi.me();
      onAuth(me.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  const submitForgotPassword = async () => {
    setError('');
    setInfo('');
    const username = String(form.username || '').trim();
    if (!username) {
      setError('Bitte zuerst Benutzername eingeben.');
      return;
    }
    try {
      await authApi.forgotPassword(username);
      setInfo('Anfrage gesendet. Nach Admin-Freigabe kannst du ein neues Passwort vergeben.');
    } catch (err) {
      setError(err.message);
    }
  };

  const submitResetPassword = async () => {
    setError('');
    setInfo('');
    if (!form.username) {
      setError('Benutzername fehlt.');
      return;
    }
    if (!resetForm.newPassword || !resetForm.confirmPassword) {
      setError('Bitte beide Passwort-Felder ausfüllen.');
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    try {
      await authApi.resetPasswordWithUsername({
        username: form.username,
        newPassword: resetForm.newPassword,
      });
      setShowResetForm(false);
      setResetForm({ newPassword: '', confirmPassword: '' });
      setInfo('Neues Passwort gespeichert. Jetzt bitte normal anmelden.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <h2>Login</h2>
        {error && <p className="error-text">{error}</p>}
        {info && <p className="hint">{info}</p>}
        <FormField
          label="Benutzername"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          onBlur={() => checkResetStatus(form.username)}
        />
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
        <button type="button" className="ghost-btn" onClick={submitForgotPassword}>
          Passwort vergessen
        </button>
        {showResetForm && (
          <div className="reset-box">
            <h4>Neues Passwort vergeben</h4>
            <label className="password-field">
              <span>Neues Passwort</span>
              <div className="password-input-wrap">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={resetForm.newPassword}
                  onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                />
              </div>
            </label>
            <label className="password-field">
              <span>Neues Passwort bestätigen</span>
              <div className="password-input-wrap">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={resetForm.confirmPassword}
                  onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                />
                <button type="button" className="toggle-btn" onClick={() => setShowNewPassword((v) => !v)}>
                  {showNewPassword ? 'Verbergen' : 'Anzeigen'}
                </button>
              </div>
            </label>
            <button type="button" className="primary-btn" onClick={submitResetPassword}>
              Neues Passwort speichern
            </button>
          </div>
        )}
        <p>
          Kein Konto? <Link to="/register">Registrieren</Link>
        </p>
      </form>
    </div>
  );
}
