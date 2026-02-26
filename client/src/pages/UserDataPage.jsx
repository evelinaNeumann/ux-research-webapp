import { useState } from 'react';
import { CardPanel } from '../components/CardPanel';
import { authApi } from '../api/auth';
import './UserDataPage.css';

export function UserDataPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [show, setShow] = useState({ current: false, next: false });
  const [message, setMessage] = useState('');

  const submit = async () => {
    setMessage('');
    try {
      await authApi.changePassword(form);
      setForm({ currentPassword: '', newPassword: '' });
      setMessage('Passwort erfolgreich geändert.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="user-data-grid">
      <CardPanel title="Meine User Data">
        <p className="hint">Hier kannst du dein Passwort ändern.</p>

        <label className="password-field">
          <span>Aktuelles Passwort</span>
          <div className="password-input-wrap">
            <input
              type={show.current ? 'text' : 'password'}
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            />
            <button type="button" className="toggle-btn" onClick={() => setShow({ ...show, current: !show.current })}>
              {show.current ? 'Verbergen' : 'Anzeigen'}
            </button>
          </div>
        </label>

        <label className="password-field">
          <span>Neues Passwort</span>
          <div className="password-input-wrap">
            <input
              type={show.next ? 'text' : 'password'}
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
            <button type="button" className="toggle-btn" onClick={() => setShow({ ...show, next: !show.next })}>
              {show.next ? 'Verbergen' : 'Anzeigen'}
            </button>
          </div>
        </label>

        <button className="primary-btn" onClick={submit}>Passwort speichern</button>
        {message && <small>{message}</small>}
      </CardPanel>
    </div>
  );
}
