import { useEffect, useState } from 'react';
import { studyApi } from '../api/studies';
import { sessionApi } from '../api/sessions';
import { CardPanel } from '../components/CardPanel';
import './DashboardPage.css';

export function DashboardPage() {
  const [studies, setStudies] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');

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
