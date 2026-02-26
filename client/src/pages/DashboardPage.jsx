import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studyApi } from '../api/studies';
import { sessionApi } from '../api/sessions';
import { profileApi } from '../api/profile';
import { CardPanel } from '../components/CardPanel';
import './DashboardPage.css';

const MODULE_LABELS = {
  questionnaire: 'Interview',
  card_sort: 'Card Sorting',
  image_rating: 'Bildbewertung',
  mixed: 'mixed',
};

export function DashboardPage({ user }) {
  const navigate = useNavigate();
  const [studies, setStudies] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [missingProfiles, setMissingProfiles] = useState([]);
  const [error, setError] = useState('');

  const latestSessionByStudy = sessions.reduce((acc, s) => {
    const key = String(s.study_id);
    if (!acc[key]) acc[key] = s;
    return acc;
  }, {});

  const load = async () => {
    try {
      const [studiesRes, sessionsRes] = await Promise.all([studyApi.list(), sessionApi.list()]);
      const allStudies = studiesRes.items || [];
      setStudies(allStudies);
      setSessions(sessionsRes.items || []);

      if (user?.role === 'user') {
        const checks = await Promise.allSettled(
          allStudies.map(async (s) => {
            await profileApi.getStudyProfile(s._id);
            return s._id;
          })
        );
        const missing = allStudies.filter((_, idx) => checks[idx].status === 'rejected');
        setMissingProfiles(missing);
      } else {
        setMissingProfiles([]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startSession = async (studyId) => {
    try {
      await profileApi.getStudyProfile(studyId);
    } catch {
      navigate(`/profile-setup/${studyId}`);
      return;
    }

    try {
      const session = await sessionApi.start(studyId);
      await load();
      navigate(`/session/${session._id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const openStudy = async (studyId) => {
    const existing = latestSessionByStudy[String(studyId)];
    if (existing?.status === 'done') {
      navigate(`/session/${existing._id}`);
      return;
    }
    if (existing?.status === 'in_progress') {
      navigate(`/session/${existing._id}`);
      return;
    }
    await startSession(studyId);
  };

  return (
    <div className="dashboard-grid">
      {missingProfiles.length > 0 && (
        <CardPanel title="Profilangaben fehlen">
          <p className="hint">Bitte ergänze zuerst deine Profilangaben für folgende Studien:</p>
          {missingProfiles.map((s) => (
            <div className="row-item" key={s._id}>
              <div>
                <strong>{s.name}</strong>
              </div>
              <button className="primary-btn" onClick={() => navigate(`/profile-setup/${s._id}`)}>
                Profil ergänzen
              </button>
            </div>
          ))}
        </CardPanel>
      )}

      <CardPanel title="Studien">
        {error && <p className="error-text">{error}</p>}
        {studies.map((s) => (
          <div key={s._id} className="row-item">
            <div>
              <strong>{s.name}</strong>
              <small>{s.type} • v{s.version}</small>
            </div>
            <button className="primary-btn" onClick={() => openStudy(s._id)}>
              {latestSessionByStudy[String(s._id)]?.status === 'done'
                ? 'Ansehen'
                : latestSessionByStudy[String(s._id)]?.status === 'in_progress'
                  ? 'Resume'
                  : 'Start'}
            </button>
          </div>
        ))}
      </CardPanel>

      <CardPanel title="Meine Sessions">
        {sessions.map((x) => (
          <div key={x._id} className="row-item">
            <div>
              <strong>{MODULE_LABELS[x.module_type] || x.module_type}</strong>
              <small>{x.status}</small>
            </div>
            {x.status === 'in_progress' && (
              <button className="primary-btn" onClick={() => navigate(`/session/${x._id}`)}>
                Bearbeiten
              </button>
            )}
          </div>
        ))}
      </CardPanel>
    </div>
  );
}
