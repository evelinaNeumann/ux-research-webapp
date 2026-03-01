import { useEffect, useState } from 'react';
import { CardPanel } from '../components/CardPanel';
import { authApi } from '../api/auth';
import './UserDataPage.css';

export function UserDataPage({ onAuth }) {
  const [form, setForm] = useState({ username: '', currentPassword: '', newPassword: '' });
  const [show, setShow] = useState({ current: false, next: false });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  useEffect(() => {
    (async () => {
      try {
        const me = await authApi.me();
        if (me?.authenticated && me?.user?.username) {
          setForm((prev) => ({ ...prev, username: me.user.username }));
        }
      } catch {
        // ignore initial preload errors
      }
    })();
  }, []);

  const submit = async () => {
    setMessage('');
    try {
      const payload = {
        newUsername: form.username,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      };
      const res = await authApi.changeUserData(payload);
      setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
      setMessageType('success');
      setMessage('Userdaten erfolgreich gespeichert.');
      if (typeof onAuth === 'function' && res?.user) onAuth(res.user);
    } catch (err) {
      setMessageType('error');
      setMessage(err.message);
    }
  };

  return (
    <div className="user-data-grid">
      <CardPanel title="Userdaten ändern">
        <p className="hint">Hier kannst du deinen Nutzernamen und dein Passwort ändern.</p>

        <label className="password-field">
          <span>Nutzername</span>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </label>

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

        <button className="primary-btn" onClick={submit}>Userdaten speichern</button>
        {message && <small className={messageType === 'error' ? 'status-text error' : 'status-text success'}>{message}</small>}
      </CardPanel>
    </div>
  );
}
