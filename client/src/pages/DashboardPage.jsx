import { useEffect, useState } from 'react';
import { studyApi } from '../api/studies';
import { sessionApi } from '../api/sessions';
import { authApi } from '../api/auth';
import { CardPanel } from '../components/CardPanel';
import './DashboardPage.css';

export function DashboardPage() {
  const [studies, setStudies] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwMessage, setPwMessage] = useState('');
  const [showPw, setShowPw] = useState({ current: false, next: false });

  const load = async () => {
    try {
      const [studiesRes, sessionsRes] = await Promise.all([studyApi.list(), sessionApi.list()]);
      setStudies(studiesRes.items || []);
      setSessions(sessionsRes.items || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startSession = async (studyId) => {
    await sessionApi.start(studyId);
    await load();
  };

  return (
    <div className="dashboard-grid">
      <CardPanel title="Passwort ändern">
        <label className="password-field">
          <span>Aktuelles Passwort</span>
          <div className="password-input-wrap">
            <input
              type={showPw.current ? 'text' : 'password'}
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            />
            <button type="button" className="toggle-btn" onClick={() => setShowPw({ ...showPw, current: !showPw.current })}>
              {showPw.current ? 'Verbergen' : 'Anzeigen'}
            </button>
          </div>
        </label>
        <label className="password-field">
          <span>Neues Passwort</span>
          <div className="password-input-wrap">
            <input
              type={showPw.next ? 'text' : 'password'}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            />
            <button type="button" className="toggle-btn" onClick={() => setShowPw({ ...showPw, next: !showPw.next })}>
              {showPw.next ? 'Verbergen' : 'Anzeigen'}
            </button>
          </div>
        </label>
        <button
          className="primary-btn"
          onClick={async () => {
            setPwMessage('');
            try {
              await authApi.changePassword(pwForm);
              setPwForm({ currentPassword: '', newPassword: '' });
              setPwMessage('Passwort erfolgreich geändert.');
            } catch (err) {
              setPwMessage(err.message);
            }
          }}
        >
          Passwort speichern
        </button>
        {pwMessage && <small>{pwMessage}</small>}
      </CardPanel>

      <CardPanel title="Studien">
        {error && <p className="error-text">{error}</p>}
        {studies.map((s) => (
          <div key={s._id} className="row-item">
            <div>
              <strong>{s.name}</strong>
              <small>{s.type} • v{s.version}</small>
            </div>
            <button className="primary-btn" onClick={() => startSession(s._id)}>Start / Resume</button>
          </div>
        ))}
      </CardPanel>

      <CardPanel title="Meine Sessions">
        {sessions.map((x) => (
          <div key={x._id} className="row-item">
            <div>
              <strong>{x.module_type}</strong>
              <small>{x.status}</small>
            </div>
          </div>
        ))}
      </CardPanel>
    </div>
  );
}
