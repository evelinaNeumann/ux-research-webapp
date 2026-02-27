import { useEffect, useMemo, useState } from 'react';
import { studyApi } from '../api/studies';
import { API_BASE } from '../api/http';
import { adminApi } from '../api/admin';
import { CardPanel } from '../components/CardPanel';
import { FormField } from '../components/FormField';
import './AdminPage.css';

export function AdminPage() {
  const [studies, setStudies] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState('');
  const [selectedAssignmentStudy, setSelectedAssignmentStudy] = useState('');
  const [selectedUserForAssign, setSelectedUserForAssign] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [studyForm, setStudyForm] = useState({
    name: '',
    type: 'mixed',
    description: '',
    profile_cards_source_study_id: '',
    inherit_profile_cards: false,
    inherit_user_profile_points: false,
  });
  const [studyEditForm, setStudyEditForm] = useState({
    name: '',
    type: 'mixed',
    description: '',
    is_active: true,
    profile_cards_source_study_id: '',
    inherit_profile_cards: false,
    inherit_user_profile_points: false,
  });
  const [briefFile, setBriefFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [cardLabel, setCardLabel] = useState('');
  const [cardSortColumnLabel, setCardSortColumnLabel] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCorrectIds, setTaskCorrectIds] = useState('');
  const [profileCardLabel, setProfileCardLabel] = useState('');
  const [items, setItems] = useState({ questions: [], cards: [], tasks: [] });
  const [profileCards, setProfileCards] = useState([]);
  const [cardSortColumns, setCardSortColumns] = useState([]);
  const [taskUploadFiles, setTaskUploadFiles] = useState({});
  const [taskDragOverId, setTaskDragOverId] = useState('');
  const [studyManagementOpen, setStudyManagementOpen] = useState(true);
  const [assignmentOpen, setAssignmentOpen] = useState(true);
  const [contentConfigOpen, setContentConfigOpen] = useState(true);
  const [profileWordsEditMode, setProfileWordsEditMode] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const showSuccess = (text) => setFeedback({ type: 'success', text });
  const showError = (text) => setFeedback({ type: 'error', text });

  const refreshStudies = async () => {
    const refreshed = await studyApi.list();
    const list = refreshed.items || [];
    setStudies(list);
    return list;
  };

  useEffect(() => {
    (async () => {
      const [studyRes, usersRes] = await Promise.all([studyApi.list(), adminApi.listUsers()]);
      setStudies(studyRes.items || []);
      setUsers(usersRes || []);
      if (studyRes.items?.[0]?._id) {
        setSelectedStudy(studyRes.items[0]._id);
        setSelectedAssignmentStudy(studyRes.items[0]._id);
      }
      if (usersRes?.[0]?._id) {
        setSelectedUserForAssign(usersRes[0]._id);
      }
    })();
  }, []);

  const loadContent = async (studyId) => {
    if (!studyId) return;
    const [questions, cards, tasks, assigned] = await Promise.all([
      adminApi.listQuestions(studyId),
      adminApi.listCards(studyId),
      adminApi.listTasks(studyId),
      adminApi.listAssignments(studyId),
    ]);
    const [pCards, csColumns] = await Promise.all([
      adminApi.listProfileCards(studyId),
      adminApi.listCardSortColumns(studyId),
    ]);
    setItems({ questions, cards, tasks });
    setAssignments(assigned || []);
    setProfileCards(pCards || []);
    setCardSortColumns(csColumns || []);
  };

  useEffect(() => {
    loadContent(selectedStudy);
  }, [selectedStudy]);

  useEffect(() => {
    if (!selectedAssignmentStudy) {
      setAssignments([]);
      return;
    }
    (async () => {
      const assigned = await adminApi.listAssignments(selectedAssignmentStudy);
      setAssignments(assigned || []);
    })();
  }, [selectedAssignmentStudy]);

  const selectedStudyData = useMemo(
    () => studies.find((s) => s._id === selectedStudy) || null,
    [studies, selectedStudy]
  );
  const selectedAssignmentStudyData = useMemo(
    () => studies.find((s) => s._id === selectedAssignmentStudy) || null,
    [studies, selectedAssignmentStudy]
  );

  useEffect(() => {
    if (!selectedStudyData) {
      setStudyEditForm({
        name: '',
        type: 'mixed',
        description: '',
        is_active: true,
        profile_cards_source_study_id: '',
        inherit_profile_cards: false,
        inherit_user_profile_points: false,
      });
      setBriefFile(null);
      return;
    }

    setStudyEditForm({
      name: selectedStudyData.name || '',
      type: selectedStudyData.type || 'mixed',
      description: selectedStudyData.description || '',
      is_active: selectedStudyData.is_active !== false,
      profile_cards_source_study_id: selectedStudyData.profile_cards_source_study_id || '',
      inherit_profile_cards: !!selectedStudyData.inherit_profile_cards,
      inherit_user_profile_points: !!selectedStudyData.inherit_user_profile_points,
    });
    setBriefFile(null);
  }, [selectedStudyData]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 3200);
    return () => clearTimeout(timer);
  }, [feedback]);

  const selectedLabel = useMemo(
    () => selectedStudyData?.name || 'Keine Studie',
    [selectedStudyData]
  );
  const selectedStudyType = selectedStudyData?.type || 'mixed';
  const showInterviewConfig = selectedStudyType === 'mixed' || selectedStudyType === 'questionnaire';
  const showCardSortConfig = selectedStudyType === 'mixed' || selectedStudyType === 'card_sort';
  const showTaskConfig = selectedStudyType === 'mixed' || selectedStudyType === 'task_work';

  const handleDroppedFile = (file) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      window.alert('Bitte nur PDF-Dateien hochladen.');
      return;
    }
    setBriefFile(file);
  };

  const studyPdfUrl = selectedStudyData?.brief_pdf_path
    ? `${API_BASE}${selectedStudyData.brief_pdf_path}`
    : '';
  const isTaskFileAllowed = (file) => {
    if (!file) return false;
    const name = String(file.name || '').toLowerCase();
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
    const isHtml = file.type === 'text/html' || file.type === 'application/xhtml+xml' || name.endsWith('.html') || name.endsWith('.htm');
    return isPdf || isHtml;
  };

  return (
    <div className="admin-shell">
      <CardPanel title="Studienverwaltung">
        <div className="assign-header">
          <button type="button" className="ghost-btn" onClick={() => setStudyManagementOpen((v) => !v)}>
            {studyManagementOpen ? 'Zuklappen' : 'Aufklappen'}
          </button>
        </div>

        {studyManagementOpen && (
          <>
            <div className="admin-grid">
              <FormField
                label="Studienname"
                value={studyForm.name}
                onChange={(e) => setStudyForm({ ...studyForm, name: e.target.value })}
              />
              <label className="form-field">
                <span>Studientyp</span>
                <select
                  value={studyForm.type}
                  onChange={(e) => setStudyForm({ ...studyForm, type: e.target.value })}
                >
                  <option value="mixed">mixed</option>
                  <option value="questionnaire">Interview</option>
                  <option value="card_sort">card_sort</option>
                  <option value="image_rating">image_rating</option>
                  <option value="task_work">Aufgabenbearbeitung</option>
                </select>
              </label>
              <label className="form-field study-description-field">
                <span>Studienbeschreibung</span>
                <textarea
                  rows={3}
                  value={studyForm.description}
                  onChange={(e) => setStudyForm({ ...studyForm, description: e.target.value })}
                  placeholder="Kurzbeschreibung zur Studie"
                />
              </label>
              <label className="form-field">
                <span>Profil-Wörter aus Studie übernehmen</span>
                <select
                  value={studyForm.profile_cards_source_study_id}
                  onChange={(e) =>
                    setStudyForm({
                      ...studyForm,
                      profile_cards_source_study_id: e.target.value,
                    })
                  }
                >
                  <option value="">Keine Quelle</option>
                  {studies.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="form-field checkbox-field">
                <span>Übernahme aktivieren</span>
                <input
                  type="checkbox"
                  checked={studyForm.inherit_profile_cards}
                  onChange={(e) => setStudyForm({ ...studyForm, inherit_profile_cards: e.target.checked })}
                />
              </label>
              <label className="form-field checkbox-field">
                <span>User-Schlüsselwörter aus Quellstudie übernehmen</span>
                <input
                  type="checkbox"
                  checked={studyForm.inherit_user_profile_points}
                  onChange={(e) =>
                    setStudyForm({ ...studyForm, inherit_user_profile_points: e.target.checked })
                  }
                />
              </label>
              <button
                className="primary-btn"
                onClick={async () => {
                  try {
                    const payload = {
                      name: studyForm.name,
                      type: studyForm.type,
                      description: studyForm.description,
                      profile_cards_source_study_id: studyForm.profile_cards_source_study_id || undefined,
                      inherit_profile_cards: studyForm.inherit_profile_cards,
                      inherit_user_profile_points: studyForm.inherit_user_profile_points,
                    };
                    const created = await studyApi.create(payload);
                    if (studyForm.inherit_profile_cards && studyForm.profile_cards_source_study_id) {
                      await studyApi.importProfileCards(created._id, {
                        source_study_id: studyForm.profile_cards_source_study_id,
                        inherit_user_profile_points: studyForm.inherit_user_profile_points,
                      });
                    }
                    const list = await refreshStudies();
                    setSelectedStudy(created._id);
                    setStudyForm({
                      name: '',
                      type: 'mixed',
                      description: '',
                      profile_cards_source_study_id: '',
                      inherit_profile_cards: false,
                      inherit_user_profile_points: false,
                    });
                    if (!list.some((s) => s._id === created._id)) {
                      await loadContent(created._id);
                    }
                    showSuccess('Studie erfolgreich erstellt.');
                  } catch (err) {
                    showError(err.message || 'Studie konnte nicht erstellt werden.');
                  }
                }}
              >
                Studie anlegen
              </button>
            </div>

            {selectedStudyData && (
              <div className="study-edit-card">
            <h4>Ausgewählte Studie bearbeiten</h4>
            <div className="admin-grid">
              <FormField
                label="Studienname"
                value={studyEditForm.name}
                onChange={(e) => setStudyEditForm({ ...studyEditForm, name: e.target.value })}
              />
              <label className="form-field">
                <span>Studientyp</span>
                <select
                  value={studyEditForm.type}
                  onChange={(e) => setStudyEditForm({ ...studyEditForm, type: e.target.value })}
                >
                  <option value="mixed">mixed</option>
                  <option value="questionnaire">Interview</option>
                  <option value="card_sort">card_sort</option>
                  <option value="image_rating">image_rating</option>
                  <option value="task_work">Aufgabenbearbeitung</option>
                </select>
              </label>
              <label className="form-field study-description-field">
                <span>Studienbeschreibung</span>
                <textarea
                  rows={4}
                  value={studyEditForm.description}
                  onChange={(e) => setStudyEditForm({ ...studyEditForm, description: e.target.value })}
                />
              </label>
              <label className="form-field checkbox-field">
                <span>Studie aktiv</span>
                <input
                  type="checkbox"
                  checked={studyEditForm.is_active}
                  onChange={(e) => setStudyEditForm({ ...studyEditForm, is_active: e.target.checked })}
                />
              </label>
              <label className="form-field">
                <span>Profil-Wörter aus Studie übernehmen</span>
                <select
                  value={studyEditForm.profile_cards_source_study_id}
                  onChange={(e) =>
                    setStudyEditForm({
                      ...studyEditForm,
                      profile_cards_source_study_id: e.target.value,
                    })
                  }
                >
                  <option value="">Keine Quelle</option>
                  {studies
                    .filter((s) => s._id !== selectedStudyData._id)
                    .map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                </select>
              </label>
              <label className="form-field checkbox-field">
                <span>Übernahme aktivieren</span>
                <input
                  type="checkbox"
                  checked={studyEditForm.inherit_profile_cards}
                  onChange={(e) =>
                    setStudyEditForm({ ...studyEditForm, inherit_profile_cards: e.target.checked })
                  }
                />
              </label>
              <label className="form-field checkbox-field">
                <span>User-Schlüsselwörter aus Quellstudie übernehmen</span>
                <input
                  type="checkbox"
                  checked={studyEditForm.inherit_user_profile_points}
                  onChange={(e) =>
                    setStudyEditForm({ ...studyEditForm, inherit_user_profile_points: e.target.checked })
                  }
                />
              </label>
              <button
                className="primary-btn"
                onClick={async () => {
                  try {
                    await studyApi.update(selectedStudyData._id, studyEditForm);
                    await refreshStudies();
                    showSuccess('Studie erfolgreich gespeichert.');
                  } catch (err) {
                    showError(err.message || 'Speichern fehlgeschlagen.');
                  }
                }}
              >
                Änderungen speichern
              </button>
              <button
                className="ghost-btn"
                type="button"
                disabled={!studyEditForm.profile_cards_source_study_id}
                onClick={async () => {
                  try {
                    if (!studyEditForm.profile_cards_source_study_id) return;
                    await studyApi.importProfileCards(selectedStudyData._id, {
                      source_study_id: studyEditForm.profile_cards_source_study_id,
                      inherit_user_profile_points: studyEditForm.inherit_user_profile_points,
                    });
                    await Promise.all([refreshStudies(), loadContent(selectedStudyData._id)]);
                    showSuccess('Profil-Card-Wörter erfolgreich übernommen.');
                  } catch (err) {
                    showError(err.message || 'Übernahme fehlgeschlagen.');
                  }
                }}
              >
                Profil-Wörter jetzt aus Quellstudie übernehmen
              </button>
            </div>

            <div className="pdf-upload-block">
              <h5>Studienbriefing als PDF</h5>
              <label
                className={`dropzone ${isDragOver ? 'is-dragover' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  handleDroppedFile(file);
                }}
              >
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => handleDroppedFile(e.target.files?.[0])}
                />
                <span>PDF auswählen oder hierher ziehen</span>
                {briefFile && <small>Ausgewählt: {briefFile.name}</small>}
              </label>
              <div className="pdf-actions">
                <button
                  type="button"
                  className="primary-btn"
                  disabled={!briefFile}
                  onClick={async () => {
                    try {
                      if (!briefFile || !selectedStudyData?._id) return;
                      await studyApi.uploadBriefPdf(selectedStudyData._id, briefFile);
                      setBriefFile(null);
                      await refreshStudies();
                      showSuccess('PDF erfolgreich hochgeladen.');
                    } catch (err) {
                      showError(err.message || 'PDF-Upload fehlgeschlagen.');
                    }
                  }}
                >
                  PDF hochladen
                </button>
                {studyPdfUrl && (
                  <a href={studyPdfUrl} target="_blank" rel="noreferrer" className="ghost-btn pdf-link">
                    Aktuelle PDF öffnen
                  </a>
                )}
              </div>
            </div>
              </div>
            )}

            <div className="study-list">
              {studies.map((s) => (
                <div key={s._id} className="row-item">
                  <div>
                    <strong>{s.name}</strong>
                    <small>{s.type} • v{s.version}</small>
                  </div>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={async () => {
                      const ok = window.confirm(`Studie \"${s.name}\" wirklich löschen?`);
                      if (!ok) return;
                      await studyApi.remove(s._id);
                      const list = await refreshStudies();
                      if (selectedStudy === s._id) {
                        setSelectedStudy(list[0]?._id || '');
                      }
                    }}
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardPanel>

      <CardPanel title="Studien-Zuweisung an Nutzer">
        <div className="assign-header">
          <button type="button" className="ghost-btn" onClick={() => setAssignmentOpen((v) => !v)}>
            {assignmentOpen ? 'Zuklappen' : 'Aufklappen'}
          </button>
        </div>
        {assignmentOpen && (
          <>
            <p className="hint">
              Automatische Zuweisung für neue Nutzer:{' '}
              <strong>{selectedAssignmentStudyData?.assign_to_all_users ? 'Aktiv' : 'Inaktiv'}</strong>
            </p>
            <div className="assign-toolbar">
              <label className="form-field">
                <span>Studie</span>
                <select value={selectedAssignmentStudy} onChange={(e) => setSelectedAssignmentStudy(e.target.value)}>
                  {studies.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Nutzer</span>
                <select value={selectedUserForAssign} onChange={(e) => setSelectedUserForAssign(e.target.value)}>
                  {users.filter((u) => u.role === 'user').map((u) => (
                    <option key={u._id} value={u._id}>{u.username}</option>
                  ))}
                </select>
              </label>
              <button
                className="primary-btn"
                onClick={async () => {
                  try {
                    if (!selectedAssignmentStudy || !selectedUserForAssign) return;
                    await adminApi.assignUserToStudy(selectedAssignmentStudy, selectedUserForAssign);
                    const assigned = await adminApi.listAssignments(selectedAssignmentStudy);
                    setAssignments(assigned || []);
                    showSuccess('Nutzer erfolgreich zugewiesen.');
                  } catch (err) {
                    showError(err.message || 'Zuweisung fehlgeschlagen.');
                  }
                }}
              >
                Zur Studie zuweisen
              </button>
              <button
                className="ghost-btn"
                onClick={async () => {
                  try {
                    if (!selectedAssignmentStudy) return;
                    await adminApi.assignStudyToAllUsers(selectedAssignmentStudy);
                    const [list, assigned] = await Promise.all([
                      refreshStudies(),
                      adminApi.listAssignments(selectedAssignmentStudy),
                    ]);
                    setStudies(list);
                    setAssignments(assigned || []);
                    showSuccess('Studie wurde allen Nutzern zugewiesen (inkl. zukünftiger Registrierungen).');
                  } catch (err) {
                    showError(err.message || 'Globale Zuweisung fehlgeschlagen.');
                  }
                }}
              >
                Studie an alle Nutzer zuweisen
              </button>
              <button
                className="ghost-btn"
                onClick={async () => {
                  try {
                    if (!selectedAssignmentStudy) return;
                    await adminApi.disableAssignStudyToAllUsers(selectedAssignmentStudy);
                    const list = await refreshStudies();
                    setStudies(list);
                    showSuccess('Automatische Zuweisung für neue Nutzer deaktiviert.');
                  } catch (err) {
                    showError(err.message || 'Deaktivieren fehlgeschlagen.');
                  }
                }}
              >
                Auto-Zuweisung deaktivieren
              </button>
            </div>
            {assignments.map((a) => (
              <div key={a._id} className="row-item">
                <div>
                  <strong>{a.user_id?.username || 'unbekannt'}</strong>
                  <small>Zugewiesen</small>
                </div>
                <button
                  className="danger-btn"
                  onClick={async () => {
                    await adminApi.removeAssignment(selectedAssignmentStudy, a.user_id?._id);
                    const assigned = await adminApi.listAssignments(selectedAssignmentStudy);
                    setAssignments(assigned || []);
                  }}
                >
                  Zuweisung entfernen
                </button>
              </div>
            ))}
          </>
        )}
      </CardPanel>

      <CardPanel title="Studien Content festlegen und bearbeiten">
        <div className="assign-header">
          <button type="button" className="ghost-btn" onClick={() => setContentConfigOpen((v) => !v)}>
            {contentConfigOpen ? 'Zuklappen' : 'Aufklappen'}
          </button>
        </div>
        {contentConfigOpen && (
          <div className="admin-toolbar">
            <label>
              Studie
              <select value={selectedStudy} onChange={(e) => setSelectedStudy(e.target.value)}>
                {studies.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </label>
            <span>Aktiv: {selectedLabel}</span>
          </div>
        )}
        {feedback && (
          <p className={feedback.type === 'success' ? 'feedback success' : 'feedback error'}>{feedback.text}</p>
        )}
      </CardPanel>

      {contentConfigOpen && <div className="content-config-layout">
        <div className="content-row">
          <CardPanel title="Profil-Card-Wörter (max. 8)">
            <FormField
              label="Profil-Wort"
              value={profileCardLabel}
              onChange={(e) => setProfileCardLabel(e.target.value)}
            />
            <button
              className="primary-btn"
              onClick={async () => {
                try {
                  if (!selectedStudy) return;
                  await adminApi.createProfileCard(selectedStudy, { label: profileCardLabel });
                  setProfileCardLabel('');
                  await loadContent(selectedStudy);
                  showSuccess('Profil-Wort erfolgreich erstellt.');
                } catch (err) {
                  showError(err.message || 'Profil-Wort konnte nicht erstellt werden.');
                }
              }}
            >
              Profil-Wort hinzufügen
            </button>
            <small>{profileCards.length}/8 angelegt</small>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setProfileWordsEditMode((v) => !v)}
            >
              {profileWordsEditMode ? 'Bearbeiten beenden' : 'Wörter bearbeiten'}
            </button>
            <div className="profile-word-list">
              {profileCards.map((p) => (
                <div key={p._id} className="profile-word-item">
                  <div className="chip">{p.label}</div>
                  {profileWordsEditMode && (
                    <div className="row-actions">
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={async () => {
                          try {
                            const label = window.prompt('Profil-Wort bearbeiten', p.label);
                            if (!label || label.trim() === p.label) return;
                            await adminApi.updateProfileCard(p._id, { label: label.trim() });
                            await loadContent(selectedStudy);
                            showSuccess('Profil-Wort erfolgreich gespeichert.');
                          } catch (err) {
                            showError(err.message || 'Speichern fehlgeschlagen.');
                          }
                        }}
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={async () => {
                          const ok = window.confirm('Profil-Wort wirklich löschen?');
                          if (!ok) return;
                          await adminApi.deleteProfileCard(p._id);
                          await loadContent(selectedStudy);
                        }}
                      >
                        Löschen
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardPanel>
        </div>

        {showInterviewConfig && (
        <div className="content-row">
          <CardPanel title="Fragen">
          <FormField label="Frage" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
          <button
            className="primary-btn"
            onClick={async () => {
              try {
                await adminApi.createQuestion(selectedStudy, { text: questionText, type: 'text_short', required: true });
                setQuestionText('');
                await loadContent(selectedStudy);
                showSuccess('Frage erfolgreich erstellt.');
              } catch (err) {
                showError(err.message || 'Frage konnte nicht erstellt werden.');
              }
            }}
          >
            Frage hinzufügen
          </button>
          {items.questions.map((q) => (
            <div key={q._id} className="item-row">
              <div className="chip">{q.text}</div>
              <div className="row-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={async () => {
                    try {
                      const text = window.prompt('Frage bearbeiten', q.text);
                      if (!text || text.trim() === q.text) return;
                      await adminApi.updateQuestion(q._id, { text: text.trim() });
                      await loadContent(selectedStudy);
                      showSuccess('Frage erfolgreich gespeichert.');
                    } catch (err) {
                      showError(err.message || 'Speichern fehlgeschlagen.');
                    }
                  }}
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={async () => {
                    const ok = window.confirm('Frage wirklich löschen?');
                    if (!ok) return;
                    await adminApi.deleteQuestion(q._id);
                    await loadContent(selectedStudy);
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
          </CardPanel>
        </div>
        )}

        {showCardSortConfig && (
        <div className="content-row content-row-two-col">
          <CardPanel title="Cards">
            <FormField label="Card Label" value={cardLabel} onChange={(e) => setCardLabel(e.target.value)} />
            <button
              className="primary-btn"
              onClick={async () => {
                try {
                  await adminApi.createCard(selectedStudy, { label: cardLabel });
                  setCardLabel('');
                  await loadContent(selectedStudy);
                  showSuccess('Card erfolgreich erstellt.');
                } catch (err) {
                  showError(err.message || 'Card konnte nicht erstellt werden.');
                }
              }}
            >
              Card hinzufügen
            </button>
            {items.cards.map((c) => (
              <div key={c._id} className="item-row">
                <div className="chip">{c.label}</div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={async () => {
                      try {
                        const label = window.prompt('Card bearbeiten', c.label);
                        if (!label || label.trim() === c.label) return;
                        await adminApi.updateCard(c._id, { label: label.trim() });
                        await loadContent(selectedStudy);
                        showSuccess('Card erfolgreich gespeichert.');
                      } catch (err) {
                        showError(err.message || 'Speichern fehlgeschlagen.');
                      }
                    }}
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={async () => {
                      const ok = window.confirm('Card wirklich löschen?');
                      if (!ok) return;
                      await adminApi.deleteCard(c._id);
                      await loadContent(selectedStudy);
                    }}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </CardPanel>

          <CardPanel title="Card-Sorting-Spalten">
            <FormField
              label="Spaltenname"
              value={cardSortColumnLabel}
              onChange={(e) => setCardSortColumnLabel(e.target.value)}
            />
            <button
              className="primary-btn"
              onClick={async () => {
                try {
                  if (!selectedStudy) return;
                  await adminApi.createCardSortColumn(selectedStudy, { label: cardSortColumnLabel });
                  setCardSortColumnLabel('');
                  await loadContent(selectedStudy);
                  showSuccess('Spalte erfolgreich erstellt.');
                } catch (err) {
                  showError(err.message || 'Spalte konnte nicht erstellt werden.');
                }
              }}
            >
              Spalte hinzufügen
            </button>
            {cardSortColumns.map((col) => (
              <div key={col._id} className="item-row">
                <div className="chip">{col.label}</div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={async () => {
                      try {
                        const label = window.prompt('Spalte bearbeiten', col.label);
                        if (!label || label.trim() === col.label) return;
                        await adminApi.updateCardSortColumn(col._id, { label: label.trim() });
                        await loadContent(selectedStudy);
                        showSuccess('Spalte erfolgreich gespeichert.');
                      } catch (err) {
                        showError(err.message || 'Speichern fehlgeschlagen.');
                      }
                    }}
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={async () => {
                      const ok = window.confirm('Spalte wirklich löschen?');
                      if (!ok) return;
                      await adminApi.deleteCardSortColumn(col._id);
                      await loadContent(selectedStudy);
                    }}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </CardPanel>
        </div>
        )}

        {showTaskConfig && (
        <div className="content-row">
          <CardPanel title="Aufgaben">
          <FormField label="Task Titel" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          <label className="form-field task-description-field">
            <span>Aufgabenstellung</span>
            <textarea
              rows={4}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Aufgabe formulieren"
            />
          </label>
          <FormField
            label="Richtige Antwort-IDs (Komma-getrennt)"
            value={taskCorrectIds}
            onChange={(e) => setTaskCorrectIds(e.target.value)}
          />
          <small>
            Für HTML-Interaktion: Nutze im HTML `data-answer-id="..."` an klickbaren Elementen.
            Die HTML-Datei kann nach Upload pro Aufgabe ausgewählt werden.
          </small>
          <button
            className="primary-btn"
            onClick={async () => {
              try {
                const title = taskTitle.trim();
                if (!title) {
                  showError('Bitte Task Titel eingeben.');
                  return;
                }
                await adminApi.createTask(selectedStudy, {
                  title,
                  description: taskDescription.trim(),
                  task_type: 'instruction',
                  steps: taskDescription.trim()
                    ? [
                        {
                          prompt: taskDescription.trim(),
                          order_index: 0,
                          correct_ids: taskCorrectIds
                            .split(',')
                            .map((x) => x.trim())
                            .filter(Boolean),
                        },
                      ]
                    : [],
                  config: {
                    interactive: {
                      correct_ids: taskCorrectIds
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean),
                    },
                  },
                });
                setTaskTitle('');
                setTaskDescription('');
                setTaskCorrectIds('');
                await loadContent(selectedStudy);
                showSuccess('Aufgabe erfolgreich erstellt.');
              } catch (err) {
                showError(err.message || 'Aufgabe konnte nicht erstellt werden.');
              }
            }}
          >
            Task hinzufügen
          </button>
          {items.tasks.map((t) => {
            const taskFiles = t.attachments?.length > 0
              ? t.attachments
              : t.attachment_name
                ? [{ path: t.attachment_path, name: t.attachment_name, format: t.content_format }]
                : [];
            const htmlFiles = taskFiles.filter((file) => file.format === 'html');
            const selectedHtmlPath = String(t.config?.interactive?.file_path || '');
            const taskSteps = Array.isArray(t.steps)
              ? [...t.steps].sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
              : [];
            return (
              <div key={t._id} className="task-item">
                <div className="item-row">
                  <div>
                    <div className="chip">{t.title}</div>
                    {t.description && <small className="task-file-meta">{t.description}</small>}
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={async () => {
                        try {
                          const title = window.prompt('Aufgabe bearbeiten', t.title);
                          if (!title) return;
                          const description = window.prompt('Aufgabenstellung bearbeiten', t.description || '');
                          if (description === null) return;
                          const correct = window.prompt(
                            'Richtige Antwort-IDs bearbeiten (Komma-getrennt)',
                            Array.isArray(t.config?.interactive?.correct_ids)
                              ? t.config.interactive.correct_ids.join(', ')
                              : ''
                          );
                          if (correct === null) return;
                          const nextCorrect = correct.split(',').map((x) => x.trim()).filter(Boolean);
                          await adminApi.updateTask(t._id, {
                            title: title.trim(),
                            description: description.trim(),
                            config: {
                              ...(t.config || {}),
                              interactive: {
                                ...(t.config?.interactive || {}),
                                correct_ids: nextCorrect,
                              },
                            },
                          });
                          await loadContent(selectedStudy);
                          showSuccess('Aufgabe erfolgreich gespeichert.');
                        } catch (err) {
                          showError(err.message || 'Speichern fehlgeschlagen.');
                        }
                      }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={async () => {
                        const ok = window.confirm('Aufgabe wirklich löschen?');
                        if (!ok) return;
                        await adminApi.deleteTask(t._id);
                        await loadContent(selectedStudy);
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
                {taskFiles.length > 0 && (
                  <div className="task-file-actions">
                    {taskFiles.map((file, idx) => (
                      <div key={`${t._id}-file-actions-${idx}`} className="task-file-action-row">
                        <a
                          href={`${API_BASE}${file.path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ghost-btn pdf-link"
                        >
                          Datei öffnen {idx + 1}
                        </a>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={async () => {
                            const ok = window.confirm(`Datei "${file.name}" wirklich löschen?`);
                            if (!ok) return;
                            await adminApi.deleteTaskAttachment(t._id, file.path);
                            await loadContent(selectedStudy);
                            showSuccess('Datei erfolgreich gelöscht.');
                          }}
                        >
                          Datei löschen
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="task-upload-block">
                  <label
                    className={`dropzone task-dropzone ${taskDragOverId === t._id ? 'is-dragover' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setTaskDragOverId(t._id);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setTaskDragOverId('');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setTaskDragOverId('');
                      const files = Array.from(e.dataTransfer.files || []);
                      if (files.length === 0) return;
                      if (files.some((file) => !isTaskFileAllowed(file))) {
                        showError('Nur PDF oder HTML Dateien sind erlaubt.');
                        return;
                      }
                      setTaskUploadFiles((prev) => ({ ...prev, [t._id]: files }));
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.html,.htm,application/pdf,text/html"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        if (files.some((file) => !isTaskFileAllowed(file))) {
                          showError('Nur PDF oder HTML Dateien sind erlaubt.');
                          return;
                        }
                        setTaskUploadFiles((prev) => ({ ...prev, [t._id]: files }));
                      }}
                    />
                    <span>Aufgaben-Dateien (PDF/HTML) auswählen oder hierher ziehen</span>
                    {taskUploadFiles[t._id]?.length > 0 && (
                      <small>Ausgewählt: {taskUploadFiles[t._id].map((f) => f.name).join(', ')}</small>
                    )}
                  </label>
                  <button
                    type="button"
                    className="primary-btn"
                    disabled={!taskUploadFiles[t._id]?.length}
                    onClick={async () => {
                      try {
                        if (!taskUploadFiles[t._id]?.length) return;
                        await adminApi.uploadTaskAttachment(t._id, taskUploadFiles[t._id]);
                        setTaskUploadFiles((prev) => {
                          const next = { ...prev };
                          delete next[t._id];
                          return next;
                        });
                        await loadContent(selectedStudy);
                        showSuccess('Aufgaben-Datei erfolgreich hochgeladen.');
                      } catch (err) {
                        showError(err.message || 'Aufgaben-Datei konnte nicht hochgeladen werden.');
                      }
                    }}
                  >
                    Datei hochladen
                  </button>
                </div>

                {htmlFiles.length > 1 && (
                  <label className="form-field">
                    <span>Interaktive HTML-Datei</span>
                    <select
                      value={selectedHtmlPath}
                      onChange={async (e) => {
                        try {
                          await adminApi.updateTask(t._id, {
                            config: {
                              ...(t.config || {}),
                              interactive: {
                                ...(t.config?.interactive || {}),
                                file_path: e.target.value,
                              },
                            },
                          });
                          await loadContent(selectedStudy);
                          showSuccess('Interaktive HTML-Datei gespeichert.');
                        } catch (err) {
                          showError(err.message || 'HTML-Datei konnte nicht gespeichert werden.');
                        }
                      }}
                    >
                      <option value="">Bitte auswählen</option>
                      {htmlFiles.map((file, idx) => (
                        <option key={`${t._id}-html-${idx}`} value={file.path}>
                          {file.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {htmlFiles.length === 1 && (
                  <small className="task-file-meta">Interaktive HTML-Datei: {htmlFiles[0].name}</small>
                )}
                {selectedHtmlPath && (
                  <small className="task-file-meta">Gewählte Datei: {selectedHtmlPath.split('/').pop()}</small>
                )}
                <div className="task-steps">
                  <strong>Aufgabenstellungen ({taskSteps.length})</strong>
                  {taskSteps.length === 0 && (
                    <small className="task-file-meta">Noch keine Aufgabenstellung vorhanden.</small>
                  )}
                  {taskSteps.map((step, idx) => (
                    <div key={`${t._id}-step-${idx}`} className="row-item">
                      <div>
                        <strong>Schritt {idx + 1}</strong>
                        <small>{step.prompt}</small>
                        {Array.isArray(step.correct_ids) && step.correct_ids.length > 0 && (
                          <small>Richtige IDs: {step.correct_ids.join(', ')}</small>
                        )}
                      </div>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="ghost-btn"
                          disabled={idx === 0}
                          onClick={async () => {
                            if (idx === 0) return;
                            const nextSteps = [...taskSteps];
                            [nextSteps[idx - 1], nextSteps[idx]] = [nextSteps[idx], nextSteps[idx - 1]];
                            await adminApi.updateTask(t._id, {
                              steps: nextSteps.map((s, i) => ({ ...s, order_index: i })),
                            });
                            await loadContent(selectedStudy);
                          }}
                        >
                          Hoch
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          disabled={idx === taskSteps.length - 1}
                          onClick={async () => {
                            if (idx >= taskSteps.length - 1) return;
                            const nextSteps = [...taskSteps];
                            [nextSteps[idx + 1], nextSteps[idx]] = [nextSteps[idx], nextSteps[idx + 1]];
                            await adminApi.updateTask(t._id, {
                              steps: nextSteps.map((s, i) => ({ ...s, order_index: i })),
                            });
                            await loadContent(selectedStudy);
                          }}
                        >
                          Runter
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={async () => {
                            const prompt = window.prompt('Aufgabenstellung bearbeiten', step.prompt || '');
                            if (prompt === null) return;
                            const correct = window.prompt(
                              'Richtige Antwort-IDs (Komma-getrennt)',
                              Array.isArray(step.correct_ids) ? step.correct_ids.join(', ') : ''
                            );
                            if (correct === null) return;
                            const nextSteps = taskSteps.map((s, i) =>
                              i === idx
                                ? {
                                    ...s,
                                    prompt: prompt.trim(),
                                    correct_ids: correct.split(',').map((x) => x.trim()).filter(Boolean),
                                  }
                                : s
                            );
                            await adminApi.updateTask(t._id, {
                              steps: nextSteps.map((s, i) => ({ ...s, order_index: i })),
                            });
                            await loadContent(selectedStudy);
                            showSuccess('Aufgabenstellung gespeichert.');
                          }}
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={async () => {
                            const ok = window.confirm('Aufgabenstellung wirklich löschen?');
                            if (!ok) return;
                            const nextSteps = taskSteps.filter((_, i) => i !== idx);
                            await adminApi.updateTask(t._id, {
                              steps: nextSteps.map((s, i) => ({ ...s, order_index: i })),
                            });
                            await loadContent(selectedStudy);
                          }}
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={async () => {
                      const prompt = window.prompt('Neue Aufgabenstellung');
                      if (!prompt || !prompt.trim()) return;
                      const correct = window.prompt('Richtige Antwort-IDs (Komma-getrennt)', '');
                      if (correct === null) return;
                      const nextSteps = [
                        ...taskSteps,
                        {
                          prompt: prompt.trim(),
                          order_index: taskSteps.length,
                          correct_ids: correct.split(',').map((x) => x.trim()).filter(Boolean),
                        },
                      ];
                      await adminApi.updateTask(t._id, {
                        steps: nextSteps,
                      });
                      await loadContent(selectedStudy);
                      showSuccess('Aufgabenstellung hinzugefügt.');
                    }}
                  >
                    Aufgabenstellung hinzufügen
                  </button>
                </div>
                {Array.isArray(t.config?.interactive?.selectable_ids) &&
                  t.config.interactive.selectable_ids.length > 0 && (
                    <small className="task-file-meta">
                      Klickbare IDs: {t.config.interactive.selectable_ids.join(', ')}
                    </small>
                  )}
                {Array.isArray(t.config?.interactive?.correct_ids) &&
                  t.config.interactive.correct_ids.length > 0 && (
                    <small className="task-file-meta">
                      Richtige IDs: {t.config.interactive.correct_ids.join(', ')}
                    </small>
                  )}
                {taskFiles.map((file, idx) => (
                  <small key={`${t._id}-file-${idx}`} className="task-file-meta">
                    Datei: {file.name} ({file.format || 'none'})
                  </small>
                ))}
              </div>
            );
          })}
          </CardPanel>
        </div>
        )}
      </div>}
    </div>
  );
}
