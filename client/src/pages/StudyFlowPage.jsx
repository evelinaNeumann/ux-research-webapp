import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studyApi } from '../api/studies';
import { sessionApi } from '../api/sessions';
import { API_BASE } from '../api/http';
import { CardPanel } from '../components/CardPanel';
import './StudyFlowPage.css';

export function StudyFlowPage({ user }) {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const [study, setStudy] = useState(null);
  const [sections, setSections] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [briefingState, setBriefingState] = useState({ open: false, section: null });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [studyRes, sectionsRes, sessionsRes] = await Promise.all([
        studyApi.getById(studyId),
        studyApi.getComposedSections(studyId),
        sessionApi.list(),
      ]);
      setStudy(studyRes || null);
      setSections(Array.isArray(sectionsRes?.sections) ? sectionsRes.sections : []);
      setSessions(Array.isArray(sessionsRes?.items) ? sessionsRes.items : []);
    } catch (err) {
      setError(err.message || 'Flow konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [studyId]);

  const latestSessionByStudy = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      const key = String(s.study_id || '');
      if (!key || map[key]) continue;
      map[key] = s;
    }
    return map;
  }, [sessions]);

  const nextSection = useMemo(() => {
    for (const section of sections) {
      const session = latestSessionByStudy[String(section._id)];
      if (!session || session.status !== 'done') {
        return { section, session: session?.status === 'in_progress' ? session : null };
      }
    }
    return null;
  }, [sections, latestSessionByStudy]);

  const sectionStatus = (sectionId) => {
    const session = latestSessionByStudy[String(sectionId)];
    if (!session) return 'offen';
    if (session.status === 'done') return 'abgeschlossen';
    return 'in Bearbeitung';
  };

  const gotoSectionSession = async (section, resumeSession = null) => {
    if (!section) return;
    if (resumeSession?._id) {
      navigate(`/session/${resumeSession._id}?flowStudy=${studyId}`);
      return;
    }

    try {
      setStarting(true);
      const session = await sessionApi.start(section._id, studyId);
      navigate(`/session/${session._id}?flowStudy=${studyId}`);
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('profile setup required')) {
        navigate(`/profile-setup/${section._id}?flowStudy=${studyId}`);
        return;
      }
      setError(msg || 'Abschnitt konnte nicht gestartet werden.');
    } finally {
      setStarting(false);
    }
  };

  const continueToNext = async () => {
    if (!nextSection?.section) return;
    if (nextSection.session?._id) {
      await gotoSectionSession(nextSection.section, nextSection.session);
      return;
    }
    if (user?.role === 'user' && nextSection.section?.brief_pdf_path) {
      setBriefingState({ open: true, section: nextSection.section });
      return;
    }
    await gotoSectionSession(nextSection.section, null);
  };

  if (loading) return <div className="splash">Study Flow wird geladen...</div>;

  return (
    <div className="study-flow-grid">
      <CardPanel title={`Mixed Studie: ${study?.name || 'Unbenannt'}`}>
        {error && <p className="error-text">{error}</p>}
        {study?.description && <p className="hint">{study.description}</p>}
        {sections.length === 0 && (
          <p className="hint">Für diese Mixed Studie sind noch keine Studienabschnitte hinterlegt.</p>
        )}
        {sections.map((section, idx) => (
          <div key={section._id} className="row-item">
            <div>
              <strong>{idx + 1}. {section.name}</strong>
              <small>{section.type} • {sectionStatus(section._id)}</small>
            </div>
          </div>
        ))}

        {sections.length > 0 && (
          <div className="study-flow-actions">
            {nextSection ? (
              <button className="primary-btn" type="button" onClick={continueToNext} disabled={starting}>
                {starting
                  ? 'Bitte warten...'
                  : nextSection.session?._id
                    ? 'Nächsten Abschnitt fortsetzen'
                    : 'Nächsten Abschnitt starten'}
              </button>
            ) : (
              <p className="success-text">Alle Abschnitte dieser Mixed Studie wurden abgeschlossen.</p>
            )}
            <button className="ghost-btn" type="button" onClick={() => navigate('/')}>Zurück zum Dashboard</button>
          </div>
        )}
      </CardPanel>

      {briefingState.open && briefingState.section && (
        <div className="briefing-overlay" role="dialog" aria-modal="true">
          <div className="briefing-modal">
            <h3>Abschnitts-Briefing: {briefingState.section.name}</h3>
            <p className="hint">Bitte lies zuerst das Briefing. Danach startet der nächste Studienabschnitt.</p>
            <iframe
              className="briefing-frame"
              title={`Briefing ${briefingState.section.name}`}
              src={`${API_BASE}${briefingState.section.brief_pdf_path}`}
            />
            <div className="briefing-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setBriefingState({ open: false, section: null })}
                disabled={starting}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={starting}
                onClick={async () => {
                  const section = briefingState.section;
                  setBriefingState({ open: false, section: null });
                  await gotoSectionSession(section, null);
                }}
              >
                {starting ? 'Bitte warten...' : 'Briefing gelesen, Abschnitt starten'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
