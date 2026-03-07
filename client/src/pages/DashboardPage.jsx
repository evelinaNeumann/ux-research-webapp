import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studyApi } from '../api/studies';
import { sessionApi } from '../api/sessions';
import { profileApi } from '../api/profile';
import { researchApi } from '../api/research';
import { API_BASE } from '../api/http';
import { CardPanel } from '../components/CardPanel';
import './DashboardPage.css';

const MODULE_LABELS = {
  questionnaire: 'Interview',
  card_sort: 'Card Sorting',
  image_rating: 'Bildbewertung',
  task_work: 'Aufgabenbearbeitung',
  mixed: 'mixed',
};

function defaultModulesForStudy(study) {
  const type = String(study?.type || 'mixed');
  if (type === 'questionnaire') return ['questionnaire'];
  if (type === 'card_sort') return ['card_sort'];
  if (type === 'image_rating') return ['image_rating'];
  if (type === 'task_work') return [];
  return ['questionnaire', 'card_sort', 'image_rating'];
}

export function DashboardPage({ user }) {
  const navigate = useNavigate();
  const [studies, setStudies] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionMeta, setSessionMeta] = useState({});
  const [missingProfiles, setMissingProfiles] = useState([]);
  const [error, setError] = useState('');
  const [briefingState, setBriefingState] = useState({
    open: false,
    study: null,
    resumeSessionId: '',
  });
  const [briefingLoading, setBriefingLoading] = useState(false);

  const standaloneSessions = sessions.filter((s) => !s.flow_study_id);

  const latestSessionByStudy = standaloneSessions.reduce((acc, s) => {
    const key = String(s.study_id);
    if (!acc[key]) acc[key] = s;
    return acc;
  }, {});

  const mixedProgressByStudy = useMemo(() => {
    const result = {};
    const sessionsByFlow = sessions.reduce((acc, sessionItem) => {
      const flowId = String(sessionItem.flow_study_id || '');
      if (!flowId) return acc;
      if (!acc[flowId]) acc[flowId] = [];
      acc[flowId].push(sessionItem);
      return acc;
    }, {});

    for (const studyItem of studies) {
      const studyId = String(studyItem?._id || '');
      const composed = Array.isArray(studyItem?.composed_sections) ? studyItem.composed_sections : [];
      if (!studyId || composed.length === 0) continue;

      const sectionIds = composed.map((section) => String(section?.study_id || '')).filter(Boolean);
      if (sectionIds.length === 0) {
        result[studyId] = { status: 'open', completedCount: 0, totalCount: 0, lastAccess: null };
        continue;
      }

      const flowSessions = sessionsByFlow[studyId] || [];
      const latestBySection = {};
      for (const flowSession of flowSessions) {
        const sectionId = String(flowSession.study_id || '');
        if (!sectionId || latestBySection[sectionId]) continue;
        latestBySection[sectionId] = flowSession;
      }

      const completedCount = sectionIds.filter((id) => latestBySection[id]?.status === 'done').length;
      const hasInProgress = sectionIds.some((id) => latestBySection[id]?.status === 'in_progress');
      const status = completedCount >= sectionIds.length ? 'done' : (hasInProgress || completedCount > 0 ? 'in_progress' : 'open');
      const lastAccess = flowSessions
        .map((row) => row.updatedAt || row.completed_at || row.started_at || null)
        .find(Boolean) || null;

      result[studyId] = {
        status,
        completedCount,
        totalCount: sectionIds.length,
        lastAccess,
      };
    }
    return result;
  }, [sessions, studies]);

  const isUser = user?.role === 'user';
  const openStudies = studies.filter((s) => {
    const studyId = String(s._id);
    const isComposedStudy = Array.isArray(s?.composed_sections) && s.composed_sections.length > 0;
    if (isComposedStudy) {
      return mixedProgressByStudy[studyId]?.status !== 'done';
    }
    return latestSessionByStudy[studyId]?.status !== 'done';
  });
  const sessionsToShow = isUser ? standaloneSessions.filter((s) => s.status === 'done') : sessions;
  const completedMixedStudies = isUser
    ? studies.filter((s) => mixedProgressByStudy[String(s._id)]?.status === 'done')
    : [];

  const load = async () => {
    try {
      const [studiesRes, sessionsRes] = await Promise.all([studyApi.list(), sessionApi.list()]);
      const allStudies = studiesRes.items || [];
      const allowedStudyIds = new Set(allStudies.map((s) => String(s._id)));
      const allSessions = (sessionsRes.items || []).filter((s) => allowedStudyIds.has(String(s.study_id)));
      const standaloneAllSessions = allSessions.filter((s) => !s.flow_study_id);
      setStudies(allStudies);
      setSessions(allSessions);
      await enrichSessionMeta(user?.role === 'user' ? standaloneAllSessions : allSessions, allStudies);

      if (user?.role === 'user') {
        const studiesNeedingProfile = allStudies.filter(
          (studyItem) => !Array.isArray(studyItem.composed_sections) || studyItem.composed_sections.length === 0
        );
        const checks = await Promise.allSettled(
          studiesNeedingProfile.map(async (s) => {
            await profileApi.getStudyProfile(s._id);
            return s._id;
          })
        );
        const missing = studiesNeedingProfile.filter((_, idx) => checks[idx].status === 'rejected');
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
          : defaultModulesForStudy(study);

        if (!totalByStudyId[studyId]) {
          const [q, c, columns, i] = await Promise.all([
            studyApi.getQuestions(studyId),
            studyApi.getCards(studyId),
            studyApi.getCardSortColumns(studyId),
            studyApi.getImages(studyId),
          ]);
          totalByStudyId[studyId] = {
            questionnaire: q.length,
            card_sort: c.length,
            card_sort_columns: columns.length,
            image_rating: i.length,
          };
        }

        const totals = totalByStudyId[studyId];
        const availableModules = modules.filter((m) => {
          if (m === 'questionnaire') return totals.questionnaire > 0;
          if (m === 'card_sort') return totals.card_sort > 0 && totals.card_sort_columns > 0;
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
          card_sort: cardSelectedCount >= totals.card_sort && totals.card_sort > 0,
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
      const session = await sessionApi.start(studyId);
      await load();
      navigate(`/session/${session._id}`);
    } catch (err) {
      if (String(err?.message || '').toLowerCase().includes('profile setup required')) {
        navigate(`/profile-setup/${studyId}`);
        return;
      }
      setError(err.message);
    }
  };

  const ensureProfileReady = async (studyId) => {
    if (user?.role !== 'user') return true;
    try {
      await profileApi.getStudyProfile(studyId);
      return true;
    } catch {
      navigate(`/profile-setup/${studyId}`);
      return false;
    }
  };

  const openStudy = async (studyId) => {
    const study = studies.find((s) => String(s._id) === String(studyId));
    const isComposedStudy = Array.isArray(study?.composed_sections) && study.composed_sections.length > 0;
    if (isComposedStudy) {
      navigate(`/study-flow/${studyId}`);
      return;
    }
    const existing = latestSessionByStudy[String(studyId)];
    if (existing?.status === 'done') {
      navigate(`/session/${existing._id}`);
      return;
    }
    const profileReady = await ensureProfileReady(studyId);
    if (!profileReady) return;
    const hasBriefingPdf = user?.role === 'user' && !existing && !!study?.brief_pdf_path;
    if (hasBriefingPdf) {
      setBriefingState({
        open: true,
        study,
        resumeSessionId: existing?.status === 'in_progress' ? existing._id : '',
      });
      return;
    }

    if (existing?.status === 'in_progress') {
      navigate(`/session/${existing._id}`);
      return;
    }
    await startSession(studyId);
  };

  const continueAfterBriefing = async () => {
    const studyId = briefingState.study?._id;
    if (!studyId) return;
    try {
      setBriefingLoading(true);
      if (briefingState.resumeSessionId) {
        setBriefingState({ open: false, study: null, resumeSessionId: '' });
        navigate(`/session/${briefingState.resumeSessionId}`);
        return;
      }
      setBriefingState({ open: false, study: null, resumeSessionId: '' });
      await startSession(studyId);
    } finally {
      setBriefingLoading(false);
    }
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
              {(Array.isArray(s?.composed_sections) && s.composed_sections.length > 0)
                ? (mixedProgressByStudy[String(s._id)]?.status === 'done'
                    ? 'Ansehen'
                    : mixedProgressByStudy[String(s._id)]?.status === 'in_progress'
                      ? 'Fortsetzen'
                      : 'Start')
                : (latestSessionByStudy[String(s._id)]?.status === 'done'
                    ? 'Ansehen'
                    : latestSessionByStudy[String(s._id)]?.status === 'in_progress'
                      ? 'Fortsetzen'
                      : 'Start')}
            </button>
          </div>
        ))}
        {isUser && openStudies.length === 0 && (
          <p className="hint">Aktuell keine Studien in Bearbeitung oder keine neue Studien zugewiesen.</p>
        )}
      </CardPanel>

      <CardPanel title={isUser ? 'Bereits bearbeitete Studien' : 'Meine Sessions'}>
        {sessionsToShow.length === 0 && completedMixedStudies.length === 0 && (
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
        {completedMixedStudies.map((studyItem) => (
          <div key={`mixed-done-${studyItem._id}`} className="row-item">
            <div className="session-info">
              <strong>{studyItem.name}</strong>
              <small>mixed • abgeschlossen</small>
              {studyItem.description && <small className="study-description">{studyItem.description}</small>}
              <small>
                Fortschritt: {mixedProgressByStudy[String(studyItem._id)]?.completedCount || 0}/
                {mixedProgressByStudy[String(studyItem._id)]?.totalCount || 0} Abschnitte
              </small>
              <small>
                Letzter Zugriff: {formatDateTime(mixedProgressByStudy[String(studyItem._id)]?.lastAccess)}
              </small>
            </div>
            <button className="primary-btn" onClick={() => navigate(`/study-flow/${studyItem._id}`)}>
              Ansehen
            </button>
          </div>
        ))}
      </CardPanel>

      {briefingState.open && briefingState.study && (
        <div className="briefing-overlay" role="dialog" aria-modal="true">
          <div className="briefing-modal">
            <h3>Studienbriefing: {briefingState.study.name}</h3>
            <p className="hint">Bitte lies zuerst das Briefing. Danach kannst du mit der Studie starten.</p>
            <iframe
              className="briefing-frame"
              title={`Briefing ${briefingState.study.name}`}
              src={`${API_BASE}${briefingState.study.brief_pdf_path}`}
            />
            <div className="briefing-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setBriefingState({ open: false, study: null, resumeSessionId: '' })}
                disabled={briefingLoading}
              >
                Abbrechen
              </button>
              <button type="button" className="primary-btn" onClick={continueAfterBriefing} disabled={briefingLoading}>
                {briefingLoading
                  ? 'Bitte warten...'
                  : briefingState.resumeSessionId
                    ? 'Weiter zur Studie'
                    : 'Briefing gelesen, Studie starten'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
