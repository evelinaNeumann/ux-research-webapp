import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studyApi } from '../api/studies';
import { sessionApi } from '../api/sessions';
import { profileApi } from '../api/profile';
import { researchApi } from '../api/research';
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
  const [sessionMeta, setSessionMeta] = useState({});
  const [missingProfiles, setMissingProfiles] = useState([]);
  const [error, setError] = useState('');

  const latestSessionByStudy = sessions.reduce((acc, s) => {
    const key = String(s.study_id);
    if (!acc[key]) acc[key] = s;
    return acc;
  }, {});

  const isUser = user?.role === 'user';
  const openStudies = studies.filter((s) => latestSessionByStudy[String(s._id)]?.status !== 'done');
  const sessionsToShow = isUser ? sessions.filter((s) => s.status === 'done') : sessions;

  const load = async () => {
    try {
      const [studiesRes, sessionsRes] = await Promise.all([studyApi.list(), sessionApi.list()]);
      const allStudies = studiesRes.items || [];
      const allowedStudyIds = new Set(allStudies.map((s) => String(s._id)));
      const allSessions = (sessionsRes.items || []).filter((s) => allowedStudyIds.has(String(s.study_id)));
      setStudies(allStudies);
      setSessions(allSessions);
      await enrichSessionMeta(allSessions, allStudies);

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

  const enrichSessionMeta = async (sessionsList, studiesList) => {
    const studyById = Object.fromEntries((studiesList || []).map((s) => [String(s._id), s]));
    const totalByStudyId = {};

    const metaEntries = await Promise.all(
      (sessionsList || []).map(async (sessionItem) => {
        const studyId = String(sessionItem.study_id);
        const study = studyById[studyId];
        const modules = study?.module_order?.length
          ? study.module_order
          : ['questionnaire', 'card_sort', 'image_rating'];

        if (!totalByStudyId[studyId]) {
          const [q, c, i] = await Promise.all([
            studyApi.getQuestions(studyId),
            studyApi.getCards(studyId),
            studyApi.getImages(studyId),
          ]);
          totalByStudyId[studyId] = {
            questionnaire: q.length,
            card_sort: c.length,
            image_rating: i.length,
          };
        }

        const totals = totalByStudyId[studyId];
        const availableModules = modules.filter((m) => {
          if (m === 'questionnaire') return totals.questionnaire > 0;
          if (m === 'card_sort') return totals.card_sort > 0;
          if (m === 'image_rating') return totals.image_rating > 0;
          return false;
        });
        const [savedAnswers, savedCardSort, savedRatings] = await Promise.all([
          researchApi.getAnswersBySession(sessionItem._id),
          researchApi.getCardSortBySession(sessionItem._id),
          researchApi.getImageRatingsBySession(sessionItem._id),
        ]);

        const answeredCount = new Set((savedAnswers || []).map((a) => String(a.question_id))).size;
        const cardSelectedCount = (savedCardSort?.card_groups || []).reduce(
          (sum, g) => sum + ((g.card_ids || []).length),
          0
        );
        const ratedCount = new Set((savedRatings || []).map((r) => String(r.image_id))).size;

        const completedByModule = {
          questionnaire: answeredCount >= totals.questionnaire,
          card_sort: cardSelectedCount > 0,
          image_rating: ratedCount >= totals.image_rating,
        };
        const completedModules = availableModules.filter((m) => completedByModule[m]).length;
        const totalModules = availableModules.length;
        const moduleProgressValues = {
          questionnaire: `${answeredCount}/${totals.questionnaire}`,
          card_sort: `${Math.min(cardSelectedCount, totals.card_sort)}/${totals.card_sort}`,
          image_rating: `${ratedCount}/${totals.image_rating}`,
        };
        const moduleProgressText = availableModules
          .map((m) => `${MODULE_LABELS[m]} ${moduleProgressValues[m]}`)
          .join(' • ');

        return [
          String(sessionItem._id),
          {
            study_name: study?.name || 'Unbekannte Studie',
            study_type: study?.type || sessionItem.module_type || 'mixed',
            progress_summary: totalModules > 0 ? `${completedModules}/${totalModules} Module` : 'Keine Module',
            last_access: sessionItem.updatedAt || sessionItem.completed_at || sessionItem.started_at,
            module_progress_text: moduleProgressText,
          },
        ];
      })
    );

    setSessionMeta(Object.fromEntries(metaEntries));
  };

  const formatDateTime = (value) => {
    if (!value) return 'n/a';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'n/a';
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

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
        {(isUser ? openStudies : studies).map((s) => (
          <div key={s._id} className="row-item">
            <div>
              <strong>{s.name}</strong>
              <small>{s.type} • v{s.version}</small>
              {s.description && <small className="study-description">{s.description}</small>}
            </div>
            <button className="primary-btn" onClick={() => openStudy(s._id)}>
              {latestSessionByStudy[String(s._id)]?.status === 'done'
                ? 'Ansehen'
                : latestSessionByStudy[String(s._id)]?.status === 'in_progress'
                  ? 'Fortsetzen'
                  : 'Start'}
            </button>
          </div>
        ))}
        {isUser && openStudies.length === 0 && (
          <p className="hint">Aktuell keine Studien in Bearbeitung oder keine neue Studien zugewiesen.</p>
        )}
      </CardPanel>

      <CardPanel title={isUser ? 'Bereits bearbeitete Studien' : 'Meine Sessions'}>
        {sessionsToShow.length === 0 && (
          <p>{isUser ? 'Noch keine bearbeiteten Studien vorhanden.' : 'Keine Sessions vorhanden.'}</p>
        )}
        {sessionsToShow.map((x) => (
          <div key={x._id} className="row-item">
            <div className="session-info">
              <strong>{sessionMeta[x._id]?.study_name || 'Studie'}</strong>
              <small>
                {MODULE_LABELS[sessionMeta[x._id]?.study_type] || sessionMeta[x._id]?.study_type || 'mixed'} • {x.status === 'done' ? 'abgeschlossen' : 'in Bearbeitung'}
              </small>
              {studies.find((s) => String(s._id) === String(x.study_id))?.description && (
                <small className="study-description">
                  {studies.find((s) => String(s._id) === String(x.study_id))?.description}
                </small>
              )}
              <small>Fortschritt: {sessionMeta[x._id]?.progress_summary || '0/0 Module'}</small>
              <small>Letzter Zugriff: {formatDateTime(sessionMeta[x._id]?.last_access)}</small>
              <small>{sessionMeta[x._id]?.module_progress_text || 'Keine Modul-Daten'}</small>
            </div>
            <button className="primary-btn" onClick={() => navigate(`/session/${x._id}`)}>
              {x.status === 'done' ? 'Ansehen' : 'Fortsetzen'}
            </button>
          </div>
        ))}
      </CardPanel>
    </div>
  );
}
