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
  const [profileCardLabel, setProfileCardLabel] = useState('');
  const [items, setItems] = useState({ questions: [], cards: [], tasks: [] });
  const [profileCards, setProfileCards] = useState([]);
  const [cardSortColumns, setCardSortColumns] = useState([]);
  const [studyManagementOpen, setStudyManagementOpen] = useState(true);
  const [assignmentOpen, setAssignmentOpen] = useState(true);
  const [contentConfigOpen, setContentConfigOpen] = useState(true);
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

      {contentConfigOpen && <div className="admin-grid">
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

        <CardPanel title="Aufgaben">
          <FormField label="Task Titel" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          <button
            className="primary-btn"
            onClick={async () => {
              try {
                await adminApi.createTask(selectedStudy, {
                  title: taskTitle,
                  description: '',
                  task_type: 'instruction',
                });
                setTaskTitle('');
                await loadContent(selectedStudy);
                showSuccess('Aufgabe erfolgreich erstellt.');
              } catch (err) {
                showError(err.message || 'Aufgabe konnte nicht erstellt werden.');
              }
            }}
          >
            Task hinzufügen
          </button>
          {items.tasks.map((t) => (
            <div key={t._id} className="item-row">
              <div className="chip">{t.title}</div>
              <div className="row-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={async () => {
                    try {
                      const title = window.prompt('Aufgabe bearbeiten', t.title);
                      if (!title || title.trim() === t.title) return;
                      await adminApi.updateTask(t._id, { title: title.trim() });
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
          ))}
        </CardPanel>

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
          {profileCards.map((p) => (
            <div key={p._id} className="item-row">
              <div className="chip">{p.label}</div>
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
            </div>
          ))}
        </CardPanel>
      </div>}
    </div>
  );
}
