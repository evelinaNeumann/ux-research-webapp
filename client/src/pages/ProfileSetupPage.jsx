import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CardPanel } from '../components/CardPanel';
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
  const navigate = useNavigate();
  const [ageRanges, setAgeRanges] = useState([]);
  const [cards, setCards] = useState([]);
  const [message, setMessage] = useState('');
  const [prefillInfo, setPrefillInfo] = useState('');
  const [form, setForm] = useState({
    age_range: '',
    role_category: 'schueler_azubi_student',
    role_custom: '',
    key_points: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const [opts, profileCards, prefill] = await Promise.all([
          profileApi.options(),
          studyApi.getProfileCards(studyId),
          profileApi.getStudyPrefill(studyId),
        ]);
        setAgeRanges(opts.age_ranges || []);
        setCards(profileCards || []);
        const prefillPoints = Array.isArray(prefill?.key_points) ? prefill.key_points : [];
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
      const session = await sessionApi.start(studyId);
      navigate(`/session/${session._id}`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="profile-shell">
      <CardPanel title="User Data vor Studienstart">
        <p className="hint">Bitte zuerst Profildaten ausfüllen, um mit der Studie zu starten.</p>

        <label className="form-field">
          <span>Alter im Range</span>
          <select value={form.age_range} onChange={(e) => setForm({ ...form, age_range: e.target.value })}>
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
              onChange={(e) => setForm({ ...form, role_custom: e.target.value })}
              placeholder="Eigene Eingabe"
            />
          </label>
        )}

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
    </div>
  );
}
