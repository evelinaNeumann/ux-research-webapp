import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CardPanel } from '../components/CardPanel';
import { API_BASE } from '../api/http';
import { profileApi } from '../api/profile';
import { studyApi } from '../api/studies';
import { sessionApi } from '../api/sessions';
import './ProfileSetupPage.css';

const ROLE_OPTIONS = [
  { value: 'schueler_azubi_student', label: 'Schüler/Azubi/Student' },
  { value: 'angestellter_fachabteilung', label: 'Angestellter aus Fachabteilung' },
  { value: 'leitende_position', label: 'Leitender Position' },
  { value: 'other', label: 'kein treffer (eigene Eingabe möglich)' },
];

export function ProfileSetupPage() {
  const { studyId } = useParams();
  const [searchParams] = useSearchParams();
  const flowStudyId = String(searchParams.get('flowStudy') || '').trim();
  const navigate = useNavigate();
  const [ageRanges, setAgeRanges] = useState([]);
  const [cards, setCards] = useState([]);
  const [study, setStudy] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [prefillInfo, setPrefillInfo] = useState('');
  const [demographicsInfo, setDemographicsInfo] = useState('');
  const [demographicsLocked, setDemographicsLocked] = useState(false);
  const [form, setForm] = useState({
    age_range: '',
    role_category: 'schueler_azubi_student',
    role_custom: '',
    key_points: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const [opts, profileCards, prefill, studyRes] = await Promise.all([
          profileApi.options(),
          studyApi.getProfileCards(studyId),
          profileApi.getStudyPrefill(studyId),
          studyApi.getById(studyId),
        ]);
        setAgeRanges(opts.age_ranges || []);
        setCards(profileCards || []);
        setStudy(studyRes || null);
        const prefillPoints = Array.isArray(prefill?.key_points) ? prefill.key_points : [];
        const prefillDemographics = prefill?.demographics || null;
        const shouldLockDemographics = !prefill?.ask_demographics_again && !!prefillDemographics;
        if (prefillDemographics) {
          setForm((prev) => ({
            ...prev,
            age_range: prefillDemographics.age_range || prev.age_range,
            role_category: prefillDemographics.role_category || prev.role_category,
            role_custom: prefillDemographics.role_custom || '',
          }));
        }
        setDemographicsLocked(shouldLockDemographics);
        setDemographicsInfo(
          shouldLockDemographics ? 'Alter und Rolle wurden aus deinem vorhandenen Profil übernommen.' : ''
        );
        if (prefillPoints.length === 4) {
          const sourceName = prefill.source_study_name || 'anderer Studie';
          setForm((prev) => ({ ...prev, key_points: prefillPoints }));
          setPrefillInfo(`4 Schlüsselwörter wurden aus ${sourceName} übernommen.`);
        } else {
          setPrefillInfo('');
        }

        try {
          const existing = await profileApi.getStudyProfile(studyId);
          setForm({
            age_range: existing.age_range || '',
            role_category: existing.role_category || 'schueler_azubi_student',
            role_custom: existing.role_custom || '',
            key_points: existing.key_points || [],
          });
          setPrefillInfo('');
        } catch {
          // no existing profile
        }
      } catch (err) {
        setMessage(err.message);
      }
    })();
  }, [studyId]);

  const togglePoint = (label) => {
    const exists = form.key_points.includes(label);
    if (exists) {
      setForm({ ...form, key_points: form.key_points.filter((x) => x !== label) });
      return;
    }
    if (form.key_points.length >= 4) return;
    setForm({ ...form, key_points: [...form.key_points, label] });
  };

  const saveAndStart = async () => {
    setMessage('');
    try {
      const hasProfileWords = cards.length > 0;
      if (hasProfileWords && form.key_points.length !== 4) {
        setMessage('Bitte genau 4 wichtige Punkte auswählen.');
        return;
      }

      await profileApi.saveStudyProfile(studyId, {
        ...form,
        key_points: hasProfileWords ? form.key_points : [],
      });
      if (study?.brief_pdf_path) {
        setShowBriefing(true);
        return;
      }
      const session = await sessionApi.start(studyId);
      navigate(`/session/${session._id}${flowStudyId ? `?flowStudy=${flowStudyId}` : ''}`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const continueAfterBriefing = async () => {
    try {
      setSaving(true);
      setMessage('');
      const session = await sessionApi.start(studyId);
      setShowBriefing(false);
      navigate(`/session/${session._id}${flowStudyId ? `?flowStudy=${flowStudyId}` : ''}`);
    } catch (err) {
      setMessage(err.message || 'Studie konnte nicht gestartet werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-shell">
      <CardPanel title="User Data vor Studienstart">
        <p className="hint">Bitte zuerst Profildaten ausfüllen, um mit der Studie zu starten.</p>

        <label className="form-field">
          <span>Alter im Range</span>
          <select
            value={form.age_range}
            disabled={demographicsLocked}
            onChange={(e) => setForm({ ...form, age_range: e.target.value })}
          >
            <option value="">Bitte wählen</option>
            {ageRanges.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Rolle auswählen</span>
          <select
            value={form.role_category}
            disabled={demographicsLocked}
            onChange={(e) => setForm({ ...form, role_category: e.target.value })}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>

        {form.role_category === 'other' && (
          <label className="form-field">
            <span>Eigene Rolle</span>
            <input
              value={form.role_custom}
              disabled={demographicsLocked}
              onChange={(e) => setForm({ ...form, role_custom: e.target.value })}
              placeholder="Eigene Eingabe"
            />
          </label>
        )}
        {demographicsInfo && <small className="subtext prefill-info">{demographicsInfo}</small>}

        {cards.length > 0 && (
          <div>
            <strong>4 wichtigste Punkte wählen</strong>
            <small className="subtext">({form.key_points.length}/4 ausgewählt)</small>
            {prefillInfo && <small className="subtext prefill-info">{prefillInfo}</small>}
            <div className="point-grid">
              {cards.map((c) => {
                const active = form.key_points.includes(c.label);
                return (
                  <button
                    type="button"
                    key={c._id}
                    className={active ? 'point active' : 'point'}
                    onClick={() => togglePoint(c.label)}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button className="primary-btn" onClick={saveAndStart}>Speichern und Studie starten</button>
        {message && <p className="error-text">{message}</p>}
      </CardPanel>

      {showBriefing && study?.brief_pdf_path && (
        <div className="profile-briefing-overlay" role="dialog" aria-modal="true">
          <div className="profile-briefing-modal">
            <h3>Studienbriefing: {study.name}</h3>
            <p className="hint">Bitte lies zuerst das Briefing. Danach kannst du mit der Studie starten.</p>
            <iframe
              className="profile-briefing-frame"
              title={`Briefing ${study.name}`}
              src={`${API_BASE}${study.brief_pdf_path}`}
            />
            <div className="profile-briefing-actions">
              <button type="button" className="ghost-btn" onClick={() => setShowBriefing(false)} disabled={saving}>
                Abbrechen
              </button>
              <button type="button" className="primary-btn" onClick={continueAfterBriefing} disabled={saving}>
                {saving ? 'Bitte warten...' : 'Briefing gelesen, Studie starten'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
