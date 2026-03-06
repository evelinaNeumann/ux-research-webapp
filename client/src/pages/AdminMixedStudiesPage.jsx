import { useEffect, useMemo, useState } from 'react';
import { CardPanel } from '../components/CardPanel';
import { studyApi } from '../api/studies';
import './AdminPage.css';

export function AdminMixedStudiesPage() {
  const [studies, setStudies] = useState([]);
  const [selectedMixedStudyId, setSelectedMixedStudyId] = useState('');
  const [candidateStudyId, setCandidateStudyId] = useState('');
  const [sections, setSections] = useState([]);
  const [profileSourceStudyId, setProfileSourceStudyId] = useState('');
  const [dragIndex, setDragIndex] = useState(-1);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const load = async () => {
    const res = await studyApi.list();
    const items = Array.isArray(res?.items) ? res.items : [];
    setStudies(items);
  };

  useEffect(() => {
    load();
  }, []);

  const mixedStudies = useMemo(
    () => studies.filter((s) => String(s.type || '') === 'mixed'),
    [studies]
  );

  useEffect(() => {
    if (!selectedMixedStudyId && mixedStudies[0]?._id) {
      setSelectedMixedStudyId(mixedStudies[0]._id);
    }
  }, [mixedStudies, selectedMixedStudyId]);

  const selectedMixedStudy = useMemo(
    () => studies.find((s) => String(s._id) === String(selectedMixedStudyId)) || null,
    [studies, selectedMixedStudyId]
  );

  useEffect(() => {
    const composed = Array.isArray(selectedMixedStudy?.composed_sections)
      ? [...selectedMixedStudy.composed_sections]
          .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
          .map((item) => String(item.study_id))
      : [];
    setSections(composed);
    setProfileSourceStudyId(String(selectedMixedStudy?.profile_cards_source_study_id || ''));
  }, [selectedMixedStudy]);

  const sectionCandidates = useMemo(
    () =>
      studies.filter(
        (s) =>
          String(s._id) !== String(selectedMixedStudyId) &&
          !sections.includes(String(s._id))
      ),
    [studies, selectedMixedStudyId, sections]
  );

  useEffect(() => {
    if (!candidateStudyId && sectionCandidates[0]?._id) {
      setCandidateStudyId(sectionCandidates[0]._id);
    }
  }, [sectionCandidates, candidateStudyId]);

  const sectionStudies = sections
    .map((id) => studies.find((s) => String(s._id) === String(id)))
    .filter(Boolean);

  const moveSection = (fromIdx, toIdx) => {
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx || fromIdx >= sections.length || toIdx >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    setSections(next);
  };

  const save = async () => {
    if (!selectedMixedStudyId) return;
    try {
      setMessage('');
      await studyApi.update(selectedMixedStudyId, {
        composed_sections: sections.map((id, idx) => ({ study_id: id, order_index: idx })),
        profile_cards_source_study_id: profileSourceStudyId || undefined,
        inherit_profile_cards: !!profileSourceStudyId,
        inherit_user_profile_points: !!profileSourceStudyId,
      });
      if (profileSourceStudyId) {
        await studyApi.importProfileCards(selectedMixedStudyId, {
          source_study_id: profileSourceStudyId,
          inherit_user_profile_points: true,
        });
      }
      await load();
      setMessageType('success');
      setMessage('Mixed Studie gespeichert. Reihenfolge und Profilwörter wurden übernommen.');
    } catch (err) {
      setMessageType('error');
      setMessage(err.message || 'Speichern fehlgeschlagen.');
    }
  };

  return (
    <div className="dashboard-grid">
      <CardPanel title="Mixed Studie Builder">
        <p className="hint">Erstelle eine zusammengesetzte Studie aus bestehenden Studienabschnitten.</p>

        <label className="form-field">
          <span>Mixed Studie</span>
          <select value={selectedMixedStudyId} onChange={(e) => setSelectedMixedStudyId(e.target.value)}>
            {mixedStudies.map((study) => (
              <option key={study._id} value={study._id}>{study.name}</option>
            ))}
          </select>
        </label>

        <div className="assign-toolbar">
          <label className="form-field">
            <span>Studie hinzufügen</span>
            <select value={candidateStudyId} onChange={(e) => setCandidateStudyId(e.target.value)}>
              {sectionCandidates.map((study) => (
                <option key={study._id} value={study._id}>{study.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              if (!candidateStudyId) return;
              if (sections.includes(candidateStudyId)) return;
              setSections((prev) => [...prev, candidateStudyId]);
              setCandidateStudyId('');
            }}
          >
            Abschnitt hinzufügen
          </button>
        </div>

        <label className="form-field">
          <span>Profil-Wörter übernehmen aus</span>
          <select value={profileSourceStudyId} onChange={(e) => setProfileSourceStudyId(e.target.value)}>
            <option value="">Keine Quelle</option>
            {sectionStudies.map((study) => (
              <option key={study._id} value={study._id}>{study.name}</option>
            ))}
          </select>
        </label>

        {sectionStudies.map((study, idx) => (
          <div
            key={study._id}
            className="row-item"
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              moveSection(dragIndex, idx);
              setDragIndex(-1);
            }}
          >
            <div>
              <strong>{idx + 1}. {study.name}</strong>
              <small>{study.type}</small>
            </div>
            <button
              type="button"
              className="danger-btn"
              onClick={() => setSections((prev) => prev.filter((id) => id !== String(study._id)))}
            >
              Entfernen
            </button>
          </div>
        ))}

        <div className="action-row">
          <button type="button" className="primary-btn" onClick={save}>Mixed Studie speichern</button>
        </div>
        {message && <p className={messageType === 'error' ? 'error-text' : 'hint'}>{message}</p>}
      </CardPanel>
    </div>
  );
}
