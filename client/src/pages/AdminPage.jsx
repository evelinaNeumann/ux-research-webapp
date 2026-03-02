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
    ask_demographics_again: false,
    ask_key_points_again: false,
  });
  const [studyEditForm, setStudyEditForm] = useState({
    name: '',
    type: 'mixed',
    description: '',
    is_active: true,
    profile_cards_source_study_id: '',
    inherit_profile_cards: false,
    inherit_user_profile_points: false,
    ask_demographics_again: false,
    ask_key_points_again: false,
  });
  const [briefFile, setBriefFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [cardLabel, setCardLabel] = useState('');
  const [cardSortColumnLabel, setCardSortColumnLabel] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSummary, setTaskSummary] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCorrectIds, setTaskCorrectIds] = useState('');
  const [taskStepTimeLimitSec, setTaskStepTimeLimitSec] = useState('');
  const [imageRatingPrompt, setImageRatingPrompt] = useState('');
  const [imageUploadFiles, setImageUploadFiles] = useState([]);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [imageCardPoolInput, setImageCardPoolInput] = useState('');
  const [imageCardPoolEditMode, setImageCardPoolEditMode] = useState(false);
  const [imageCardPoolSourceStudyId, setImageCardPoolSourceStudyId] = useState('');
  const [imageTaskDraft, setImageTaskDraft] = useState({
    type: 'image_questions',
    title: '',
    description: '',
    duration_sec: '5',
    max_select: '5',
    max_marks: '3',
    cards_text: '',
    questions_text: '',
    image_id_a: '',
    image_id_b: '',
  });
  const [imageTaskDragIndex, setImageTaskDragIndex] = useState(-1);
  const [profileCardLabel, setProfileCardLabel] = useState('');
  const [items, setItems] = useState({ questions: [], cards: [], tasks: [], images: [] });
  const [profileCards, setProfileCards] = useState([]);
  const [cardSortColumns, setCardSortColumns] = useState([]);
  const [taskUploadFiles, setTaskUploadFiles] = useState({});
  const [taskDragOverId, setTaskDragOverId] = useState('');
  const [taskStepDrag, setTaskStepDrag] = useState({ taskId: '', index: -1 });
  const [taskAddStepOpenById, setTaskAddStepOpenById] = useState({});
  const [taskAddStepFormById, setTaskAddStepFormById] = useState({});
  const [showClickableIdsByTask, setShowClickableIdsByTask] = useState({});
  const [taskMenuOpenId, setTaskMenuOpenId] = useState('');
  const [taskFileMenuOpenId, setTaskFileMenuOpenId] = useState('');
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
    const [questions, cards, tasks, images, assigned] = await Promise.all([
      adminApi.listQuestions(studyId),
      adminApi.listCards(studyId),
      adminApi.listTasks(studyId),
      adminApi.listImages(studyId),
      adminApi.listAssignments(studyId),
    ]);
    const [pCards, csColumns] = await Promise.all([
      adminApi.listProfileCards(studyId),
      adminApi.listCardSortColumns(studyId),
    ]);
    setItems({ questions, cards, tasks, images });
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
        ask_demographics_again: false,
        ask_key_points_again: false,
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
      ask_demographics_again: !!selectedStudyData.ask_demographics_again,
      ask_key_points_again: !!selectedStudyData.ask_key_points_again,
    });
    setImageRatingPrompt(selectedStudyData.image_rating_prompt || '');
    setImageUploadFiles([]);
    setImageDragOver(false);
    setImageCardPoolInput('');
    setImageCardPoolEditMode(false);
    setImageCardPoolSourceStudyId('');
    setImageTaskDraft({
      type: 'image_questions',
      title: '',
      description: '',
      duration_sec: '5',
      max_select: '5',
      max_marks: '3',
      cards_text: '',
      questions_text: '',
      image_id_a: '',
      image_id_b: '',
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
  const imageTaskItems = useMemo(
    () =>
      [...(selectedStudyData?.image_rating_tasks || [])].sort(
        (a, b) => Number(a.order_index || 0) - Number(b.order_index || 0)
      ),
    [selectedStudyData]
  );
  const imageCardPool = useMemo(
    () => (Array.isArray(selectedStudyData?.image_rating_card_pool) ? selectedStudyData.image_rating_card_pool : []),
    [selectedStudyData]
  );
  const selectedStudyType = selectedStudyData?.type || 'mixed';
  const showInterviewConfig = selectedStudyType === 'mixed' || selectedStudyType === 'questionnaire';
  const showCardSortConfig = selectedStudyType === 'mixed' || selectedStudyType === 'card_sort';
  const showImageConfig = selectedStudyType === 'mixed' || selectedStudyType === 'image_rating';
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
              <label className="form-field checkbox-field">
                <span>Alter und Rolle pro Studie neu abfragen</span>
                <input
                  type="checkbox"
                  checked={studyForm.ask_demographics_again}
                  onChange={(e) => setStudyForm({ ...studyForm, ask_demographics_again: e.target.checked })}
                />
              </label>
              <label className="form-field checkbox-field">
                <span>Wichtige Wörter pro Studie neu abfragen</span>
                <input
                  type="checkbox"
                  checked={studyForm.ask_key_points_again}
                  onChange={(e) => setStudyForm({ ...studyForm, ask_key_points_again: e.target.checked })}
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
                      ask_demographics_again: studyForm.ask_demographics_again,
                      ask_key_points_again: studyForm.ask_key_points_again,
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
                      ask_demographics_again: false,
                      ask_key_points_again: false,
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
            <div className="study-edit-header">
              <h4>Ausgewählte Studie bearbeiten</h4>
              <button
                type="button"
                className="danger-btn"
                onClick={async () => {
                  const ok = window.confirm(`Studie "${selectedStudyData.name}" wirklich löschen?`);
                  if (!ok) return;
                  await studyApi.remove(selectedStudyData._id);
                  const list = await refreshStudies();
                  const nextId = list[0]?._id || '';
                  setSelectedStudy(nextId);
                }}
              >
                Studie löschen
              </button>
            </div>
            <div className="admin-grid">
              <label className="form-field">
                <span>Studie auswählen</span>
                <select value={selectedStudy} onChange={(e) => setSelectedStudy(e.target.value)}>
                  {studies.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <FormField
                label="Studienname ändern"
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
              <label className="form-field checkbox-field">
                <span>Alter und Rolle pro Studie neu abfragen</span>
                <input
                  type="checkbox"
                  checked={studyEditForm.ask_demographics_again}
                  onChange={(e) =>
                    setStudyEditForm({ ...studyEditForm, ask_demographics_again: e.target.checked })
                  }
                />
              </label>
              <label className="form-field checkbox-field">
                <span>Wichtige Wörter pro Studie neu abfragen</span>
                <input
                  type="checkbox"
                  checked={studyEditForm.ask_key_points_again}
                  onChange={(e) =>
                    setStudyEditForm({ ...studyEditForm, ask_key_points_again: e.target.checked })
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

        {showImageConfig && (
        <div className="content-row">
          <CardPanel title="Bildbewertung">
            <label className="form-field task-description-field">
              <span>Aufgabenstellung Bildbewertung</span>
              <textarea
                rows={3}
                value={imageRatingPrompt}
                onChange={(e) => setImageRatingPrompt(e.target.value)}
                placeholder="z. B. Bewerte jedes Bild nach Verständlichkeit und visueller Qualität (1-5)."
              />
            </label>
            <button
              type="button"
              className="primary-btn"
              onClick={async () => {
                try {
                  const existingCount = Array.isArray(items.images) ? items.images.length : 0;
                  const pendingCount = Array.isArray(imageUploadFiles) ? imageUploadFiles.length : 0;
                  if (existingCount + pendingCount < 1) {
                    showError('Für die Aufgabenstellung müssen mindestens 1 Bild-Datei (JPG/PNG/PDF) hochgeladen sein.');
                    return;
                  }
                  await studyApi.update(selectedStudy, { image_rating_prompt: imageRatingPrompt.trim() });
                  await refreshStudies();
                  showSuccess('Aufgabenstellung für Bildbewertung gespeichert.');
                } catch (err) {
                  showError(err.message || 'Aufgabenstellung konnte nicht gespeichert werden.');
                }
              }}
            >
              Aufgabenstellung speichern
            </button>

            <div className="image-task-builder">
              <h5>Card Pool (für Bild Impression)</h5>
              <FormField
                label="Card-Pool Wort"
                value={imageCardPoolInput}
                onChange={(e) => setImageCardPoolInput(e.target.value)}
              />
              <button
                type="button"
                className="primary-btn"
                onClick={async () => {
                  try {
                    const label = String(imageCardPoolInput || '').trim();
                    if (!label) return;
                    if (imageCardPool.length >= 25) {
                      showError('Maximal 25 Card-Pool Begriffe erlaubt.');
                      return;
                    }
                    if (imageCardPool.includes(label)) {
                      showError('Begriff ist bereits im Card Pool vorhanden.');
                      return;
                    }
                    await studyApi.update(selectedStudy, {
                      image_rating_card_pool: [...imageCardPool, label],
                    });
                    await refreshStudies();
                    setImageCardPoolInput('');
                    showSuccess('Card-Pool Begriff hinzugefügt.');
                  } catch (err) {
                    showError(err.message || 'Card-Pool Begriff konnte nicht hinzugefügt werden.');
                  }
                }}
              >
                Card-Pool Begriff hinzufügen
              </button>
              <small>{imageCardPool.length}/25 im Card Pool</small>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setImageCardPoolEditMode((v) => !v)}
              >
                {imageCardPoolEditMode ? 'Bearbeiten beenden' : 'Card Pool bearbeiten'}
              </button>

              <label className="form-field">
                <span>Card Pool aus Studie übernehmen</span>
                <select
                  value={imageCardPoolSourceStudyId}
                  onChange={(e) => setImageCardPoolSourceStudyId(e.target.value)}
                >
                  <option value="">Keine Quelle</option>
                  {studies
                    .filter((s) => s._id !== selectedStudy)
                    .map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className="ghost-btn"
                disabled={!imageCardPoolSourceStudyId}
                onClick={async () => {
                  try {
                    if (!imageCardPoolSourceStudyId) return;
                    const source = studies.find((s) => s._id === imageCardPoolSourceStudyId);
                    const sourcePool = Array.isArray(source?.image_rating_card_pool)
                      ? source.image_rating_card_pool.slice(0, 25)
                      : [];
                    if (!sourcePool.length) {
                      showError('Quellstudie enthält keinen Card Pool.');
                      return;
                    }
                    await studyApi.update(selectedStudy, {
                      image_rating_card_pool: sourcePool,
                    });
                    await refreshStudies();
                    showSuccess('Card Pool erfolgreich übernommen.');
                  } catch (err) {
                    showError(err.message || 'Card Pool konnte nicht übernommen werden.');
                  }
                }}
              >
                Card Pool jetzt übernehmen
              </button>

              <div className="chip-list">
                {imageCardPool.map((label, idx) => (
                  <div key={`${label}-${idx}`} className="profile-word-item">
                    <div className="chip">{label}</div>
                    {imageCardPoolEditMode && (
                      <div className="row-actions">
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={async () => {
                            try {
                              const next = window.prompt('Card-Pool Begriff bearbeiten', label);
                              if (!next || String(next).trim() === label) return;
                              const nextPool = imageCardPool.map((item, i) => (i === idx ? String(next).trim() : item));
                              await studyApi.update(selectedStudy, { image_rating_card_pool: nextPool });
                              await refreshStudies();
                              showSuccess('Card-Pool Begriff gespeichert.');
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
                            const ok = window.confirm('Card-Pool Begriff wirklich löschen?');
                            if (!ok) return;
                            const nextPool = imageCardPool.filter((_, i) => i !== idx);
                            await studyApi.update(selectedStudy, { image_rating_card_pool: nextPool });
                            await refreshStudies();
                            showSuccess('Card-Pool Begriff gelöscht.');
                          }}
                        >
                          Löschen
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="image-task-builder">
              <h5>Bild-Aufgabentyp hinzufügen</h5>
              <div className="admin-grid">
                <label className="form-field">
                  <span>Typ</span>
                  <select
                    value={imageTaskDraft.type}
                    onChange={(e) => setImageTaskDraft((prev) => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="image_impression">Bild Impression (5 Sek. + 5 aus 25 Cards wählen)</option>
                    <option value="image_questions">Fragen zum Bild</option>
                    <option value="image_compare">Bild Vergleich</option>
                    <option value="image_dislike_mark">Markieren was nicht gefällt</option>
                  </select>
                </label>
                <FormField
                  label="Titel"
                  value={imageTaskDraft.title}
                  onChange={(e) => setImageTaskDraft((prev) => ({ ...prev, title: e.target.value }))}
                />
                <label className="form-field task-description-field">
                  <span>Beschreibung</span>
                  <textarea
                    rows={2}
                    value={imageTaskDraft.description}
                    onChange={(e) => setImageTaskDraft((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Kurze Aufgabenanweisung für User"
                  />
                </label>
              </div>

              {(imageTaskDraft.type === 'image_impression' ||
                imageTaskDraft.type === 'image_questions' ||
                imageTaskDraft.type === 'image_dislike_mark') && (
                <label className="form-field">
                  <span>Bild auswählen</span>
                  <select
                    value={imageTaskDraft.image_id_a}
                    onChange={(e) => setImageTaskDraft((prev) => ({ ...prev, image_id_a: e.target.value }))}
                  >
                    <option value="">Bitte wählen</option>
                    {(items.images || []).map((img) => (
                      <option key={img._id} value={img._id}>{img.alt_text || img._id}</option>
                    ))}
                  </select>
                </label>
              )}

              {imageTaskDraft.type === 'image_compare' && (
                <div className="admin-grid">
                  <label className="form-field">
                    <span>Bild A</span>
                    <select
                      value={imageTaskDraft.image_id_a}
                      onChange={(e) => setImageTaskDraft((prev) => ({ ...prev, image_id_a: e.target.value }))}
                    >
                      <option value="">Bitte wählen</option>
                      {(items.images || []).map((img) => (
                        <option key={img._id} value={img._id}>{img.alt_text || img._id}</option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Bild B</span>
                    <select
                      value={imageTaskDraft.image_id_b}
                      onChange={(e) => setImageTaskDraft((prev) => ({ ...prev, image_id_b: e.target.value }))}
                    >
                      <option value="">Bitte wählen</option>
                      {(items.images || []).map((img) => (
                        <option key={img._id} value={img._id}>{img.alt_text || img._id}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {imageTaskDraft.type === 'image_impression' && (
                <div className="admin-grid">
                  <FormField
                    label="Bilddauer (Sek.)"
                    value={imageTaskDraft.duration_sec}
                    onChange={(e) => setImageTaskDraft((prev) => ({ ...prev, duration_sec: e.target.value }))}
                  />
                  <FormField
                    label="Cards Auswahl (z. B. 5)"
                    value={imageTaskDraft.max_select}
                    onChange={(e) => setImageTaskDraft((prev) => ({ ...prev, max_select: e.target.value }))}
                  />
                  <label className="form-field task-description-field">
                    <span>Card Pool (eine Card pro Zeile, ideal 25)</span>
                    <textarea
                      rows={6}
                      value={imageTaskDraft.cards_text}
                      onChange={(e) => setImageTaskDraft((prev) => ({ ...prev, cards_text: e.target.value }))}
                      placeholder={'innovativ\nübersichtlich\nmodern\nvertrauenswürdig'}
                    />
                  </label>
                </div>
              )}

              {imageTaskDraft.type === 'image_questions' && (
                <label className="form-field task-description-field">
                  <span>Fragen (eine Frage pro Zeile)</span>
                  <textarea
                    rows={5}
                    value={imageTaskDraft.questions_text}
                    onChange={(e) => setImageTaskDraft((prev) => ({ ...prev, questions_text: e.target.value }))}
                    placeholder={'Was gefällt dir an diesem Bild?\nWas würdest du verbessern?'}
                  />
                </label>
              )}

              {imageTaskDraft.type === 'image_dislike_mark' && (
                <FormField
                  label="Max. Markierungen pro Bild"
                  value={imageTaskDraft.max_marks}
                  onChange={(e) => setImageTaskDraft((prev) => ({ ...prev, max_marks: e.target.value }))}
                />
              )}

              <button
                type="button"
                className="primary-btn"
                onClick={async () => {
                  try {
                    if ((items.images || []).length < 1) {
                      showError('Bitte zuerst mindestens 1 Bild-Datei hochladen.');
                      return;
                    }
                    const nextType = String(imageTaskDraft.type || '');
                    const title = String(imageTaskDraft.title || '').trim();
                    if (!title) {
                      showError('Bitte Titel für die Bild-Aufgabe eingeben.');
                      return;
                    }
                    const orderIndex = imageTaskItems.length;
                    const task_id = `imgtask_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                    const base = {
                      task_id,
                      type: nextType,
                      title,
                      description: String(imageTaskDraft.description || '').trim(),
                      order_index: orderIndex,
                    };
                    const image_ids = [];
                    if (imageTaskDraft.image_id_a) image_ids.push(imageTaskDraft.image_id_a);
                    if (nextType === 'image_compare' && imageTaskDraft.image_id_b) image_ids.push(imageTaskDraft.image_id_b);

                    if (nextType === 'image_compare' && image_ids.length < 2) {
                      showError('Für Bildvergleich bitte zwei Bilder auswählen.');
                      return;
                    }
                    if (nextType !== 'image_compare' && image_ids.length < 1) {
                      showError('Bitte mindestens ein Bild auswählen.');
                      return;
                    }

                    const nextTask = {
                      ...base,
                      image_ids,
                      duration_sec:
                        Number.isFinite(Number(imageTaskDraft.duration_sec)) && Number(imageTaskDraft.duration_sec) > 0
                          ? Math.floor(Number(imageTaskDraft.duration_sec))
                          : 5,
                      max_select:
                        Number.isFinite(Number(imageTaskDraft.max_select)) && Number(imageTaskDraft.max_select) > 0
                          ? Math.floor(Number(imageTaskDraft.max_select))
                          : 5,
                      max_marks:
                        Number.isFinite(Number(imageTaskDraft.max_marks)) && Number(imageTaskDraft.max_marks) > 0
                          ? Math.floor(Number(imageTaskDraft.max_marks))
                          : 3,
                      cards: (() => {
                        const typed = String(imageTaskDraft.cards_text || '')
                          .split('\n')
                          .map((x) => x.trim())
                          .filter(Boolean);
                        return typed.length ? typed : imageCardPool;
                      })(),
                      questions: String(imageTaskDraft.questions_text || '')
                        .split('\n')
                        .map((x) => x.trim())
                        .filter(Boolean),
                    };

                    if (nextType === 'image_impression' && nextTask.cards.length < 5) {
                      showError('Für Bild Impression bitte mehrere Cards hinterlegen (empfohlen 25).');
                      return;
                    }
                    if (nextType === 'image_questions' && nextTask.questions.length < 1) {
                      showError('Bitte mindestens eine Frage hinterlegen.');
                      return;
                    }

                    await studyApi.update(selectedStudy, {
                      image_rating_tasks: [...imageTaskItems, nextTask],
                    });
                    await refreshStudies();
                    setImageTaskDraft({
                      type: 'image_questions',
                      title: '',
                      description: '',
                      duration_sec: '5',
                      max_select: '5',
                      max_marks: '3',
                      cards_text: '',
                      questions_text: '',
                      image_id_a: '',
                      image_id_b: '',
                    });
                    showSuccess('Bild-Aufgabe hinzugefügt.');
                  } catch (err) {
                    showError(err.message || 'Bild-Aufgabe konnte nicht erstellt werden.');
                  }
                }}
              >
                Bild-Aufgabe hinzufügen
              </button>

              <div className="image-task-list">
                {imageTaskItems.map((task, idx) => (
                  <div
                    key={task.task_id || idx}
                    className={`image-task-item ${imageTaskDragIndex === idx ? 'is-dragging' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('application/x-image-task-index', String(idx));
                      setImageTaskDragIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      try {
                        const fromIdx = Number(e.dataTransfer.getData('application/x-image-task-index'));
                        const toIdx = Number(idx);
                        if (!Number.isFinite(fromIdx) || !Number.isFinite(toIdx) || fromIdx === toIdx) return;
                        const next = [...imageTaskItems];
                        const [moved] = next.splice(fromIdx, 1);
                        next.splice(toIdx, 0, moved);
                        const normalized = next.map((item, order_index) => ({ ...item, order_index }));
                        await studyApi.update(selectedStudy, { image_rating_tasks: normalized });
                        await refreshStudies();
                        showSuccess('Reihenfolge der Bild-Aufgaben gespeichert.');
                      } catch (err) {
                        showError(err.message || 'Reihenfolge konnte nicht gespeichert werden.');
                      } finally {
                        setImageTaskDragIndex(-1);
                      }
                    }}
                    onDragEnd={() => setImageTaskDragIndex(-1)}
                  >
                    <strong>{task.title}</strong>
                    <small>Typ: {task.type} • Reihenfolge: {idx + 1}</small>
                    {!!task.description && <small>{task.description}</small>}
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={async () => {
                        const ok = window.confirm('Bild-Aufgabe wirklich löschen?');
                        if (!ok) return;
                        const nextTasks = imageTaskItems
                          .filter((t) => String(t.task_id) !== String(task.task_id))
                          .map((t, i) => ({ ...t, order_index: i }));
                        await studyApi.update(selectedStudy, { image_rating_tasks: nextTasks });
                        await refreshStudies();
                        showSuccess('Bild-Aufgabe gelöscht.');
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                ))}
                {imageTaskItems.length === 0 && <small className="task-file-meta">Noch keine Bild-Aufgabe hinterlegt.</small>}
              </div>
            </div>

            <label
              className={`dropzone task-dropzone ${imageDragOver ? 'is-dragover' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setImageDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setImageDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setImageDragOver(false);
                const files = Array.from(e.dataTransfer.files || []);
                if (!files.length) return;
                const invalid = files.some((file) => {
                  const type = String(file.type || '').toLowerCase();
                  const name = String(file.name || '').toLowerCase();
                  return !(
                    type === 'image/jpeg' ||
                    type === 'image/png' ||
                    type === 'application/pdf' ||
                    name.endsWith('.jpg') ||
                    name.endsWith('.jpeg') ||
                    name.endsWith('.png') ||
                    name.endsWith('.pdf')
                  );
                });
                if (invalid) {
                  showError('Nur JPG, PNG oder PDF Dateien sind erlaubt.');
                  return;
                }
                setImageUploadFiles(files);
              }}
            >
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  const invalid = files.some((file) => {
                    const type = String(file.type || '').toLowerCase();
                    const name = String(file.name || '').toLowerCase();
                    return !(
                      type === 'image/jpeg' ||
                      type === 'image/png' ||
                      type === 'application/pdf' ||
                      name.endsWith('.jpg') ||
                      name.endsWith('.jpeg') ||
                      name.endsWith('.png') ||
                      name.endsWith('.pdf')
                    );
                  });
                  if (invalid) {
                    showError('Nur JPG, PNG oder PDF Dateien sind erlaubt.');
                    return;
                  }
                  setImageUploadFiles(files);
                }}
              />
              <span>Bilder (JPG/PNG/PDF) auswählen oder hierher ziehen</span>
              {imageUploadFiles.length > 0 && (
                <small>Ausgewählt: {imageUploadFiles.map((f) => f.name).join(', ')}</small>
              )}
            </label>
            <button
              type="button"
              className="primary-btn"
              disabled={imageUploadFiles.length === 0}
              onClick={async () => {
                try {
                  for (const file of imageUploadFiles) {
                    await adminApi.uploadImage(selectedStudy, file, { alt_text: file.name });
                  }
                  setImageUploadFiles([]);
                  await loadContent(selectedStudy);
                  showSuccess('Bild-Datei(en) erfolgreich hochgeladen.');
                } catch (err) {
                  showError(err.message || 'Bild-Upload fehlgeschlagen.');
                }
              }}
            >
              Bild-Datei hochladen
            </button>

            <div className="image-asset-list">
              {(items.images || []).map((img) => {
                const filename = String(img.path || '').split('/').pop() || '';
                const isPdf = filename.toLowerCase().endsWith('.pdf');
                return (
                  <div key={img._id} className="image-asset-item">
                    {isPdf ? (
                      <a href={`${API_BASE}/uploads/${filename}`} target="_blank" rel="noreferrer" className="ghost-btn">
                        PDF öffnen
                      </a>
                    ) : (
                      <img src={`${API_BASE}/uploads/${filename}`} alt={img.alt_text || 'Bild'} />
                    )}
                    <div className="image-asset-meta">
                      <small>{img.alt_text || filename}</small>
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={async () => {
                          const ok = window.confirm('Datei wirklich löschen?');
                          if (!ok) return;
                          await adminApi.deleteImage(img._id);
                          await loadContent(selectedStudy);
                          showSuccess('Bild-Datei gelöscht.');
                        }}
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                );
              })}
              {(!items.images || items.images.length === 0) && (
                <small className="task-file-meta">Noch keine Bild-Datei hinterlegt.</small>
              )}
            </div>
          </CardPanel>
        </div>
        )}

        {showTaskConfig && (
        <div className="content-row">
          <CardPanel title="Aufgaben">
          <FormField label="Task Titel" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          <label className="form-field task-description-field">
            <span>Aufgabenbeschreibung</span>
            <textarea
              rows={3}
              value={taskSummary}
              onChange={(e) => setTaskSummary(e.target.value)}
              placeholder="Kurze Beschreibung zur Aufgabe"
            />
          </label>
          <label className="form-field task-description-field">
            <span>Erste Aufgabenstellung (Schritt 1)</span>
            <textarea
              rows={4}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Konkrete Aufgabenanweisung für Schritt 1"
            />
          </label>
          <FormField
            label="Richtige Antwort-IDs (Komma-getrennt)"
            value={taskCorrectIds}
            onChange={(e) => setTaskCorrectIds(e.target.value)}
          />
          <FormField
            label="Zeitlimit pro Aufgabenschritt (Sekunden, optional)"
            value={taskStepTimeLimitSec}
            onChange={(e) => setTaskStepTimeLimitSec(e.target.value)}
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
                  description: taskSummary.trim(),
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
                          time_limit_sec:
                            Number.isFinite(Number(taskStepTimeLimitSec)) && Number(taskStepTimeLimitSec) > 0
                              ? Math.floor(Number(taskStepTimeLimitSec))
                              : 0,
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
                setTaskSummary('');
                setTaskDescription('');
                setTaskCorrectIds('');
                setTaskStepTimeLimitSec('');
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
            const selectedHtmlFile = selectedHtmlPath
              ? htmlFiles.find((file) => file.path === selectedHtmlPath)
              : null;
            const headerFileLabel =
              selectedHtmlFile?.name ||
              htmlFiles[0]?.name ||
              taskFiles[0]?.name ||
              'Keine Datei ausgewählt';
            const taskSteps = Array.isArray(t.steps)
              ? [...t.steps].sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
              : [];
            const addStepOpen = !!taskAddStepOpenById[t._id];
            const addStepForm = taskAddStepFormById[t._id] || {
              prompt: '',
              correct_ids: '',
              time_limit_sec: '',
            };
            return (
              <div key={t._id} className="task-item">
                <div className="task-menu-wrap">
                  <button
                    type="button"
                    className="ghost-btn task-menu-trigger"
                    onClick={() => setTaskMenuOpenId((prev) => (prev === t._id ? '' : t._id))}
                  >
                    ⋯
                  </button>
                  {taskMenuOpenId === t._id && (
                    <div className="task-menu-popover">
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
                            setTaskMenuOpenId('');
                            showSuccess('Aufgabe erfolgreich gespeichert.');
                          } catch (err) {
                            showError(err.message || 'Speichern fehlgeschlagen.');
                          }
                        }}
                      >
                        Aufgabe bearbeiten
                      </button>
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={async () => {
                          const ok = window.confirm('Aufgabe wirklich löschen?');
                          if (!ok) return;
                          await adminApi.deleteTask(t._id);
                          await loadContent(selectedStudy);
                          setTaskMenuOpenId('');
                        }}
                      >
                        Aufgabe löschen
                      </button>
                    </div>
                  )}
                </div>
                <div className="task-head-grid">
                  <div className="task-head-col">
                    <small className="task-head-label">Aufgabenname</small>
                    <div className="chip">{t.title}</div>
                  </div>
                  <div className="task-head-col task-head-col-right">
                    <small className="task-head-label">Datei</small>
                    <small className="task-file-meta task-head-file">Interaktive HTML-Datei: {headerFileLabel}</small>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => setTaskFileMenuOpenId((prev) => (prev === t._id ? '' : t._id))}
                    >
                      Datei bearbeiten / anzeigen
                    </button>

                    {taskFileMenuOpenId === t._id && (
                      <div className="task-file-menu">
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
                                  Datei ansehen {idx + 1}
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
                            Datei hinzufügen
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
                      </div>
                    )}
                  </div>
                </div>
                {t.description && (
                  <div className="task-description-block">
                    <small className="task-head-label">Aufgabenbeschreibung</small>
                    <p className="task-description-text">{t.description}</p>
                  </div>
                )}
                <div className="task-steps">
                  <strong>Aufgabenstellungen ({taskSteps.length})</strong>
                  {taskSteps.length === 0 && (
                    <small className="task-file-meta">Noch keine Aufgabenstellung vorhanden.</small>
                  )}
                  {taskSteps.length > 0 && (
                    <div className="task-steps-grid">
                      {taskSteps.map((step, idx) => (
                        <article
                          key={`${t._id}-step-${idx}`}
                          className={`task-step-card ${
                            taskStepDrag.taskId === t._id && taskStepDrag.index === idx ? 'is-dragging' : ''
                          }`}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData(
                              'application/x-task-step',
                              JSON.stringify({ taskId: t._id, index: idx })
                            );
                            event.dataTransfer.effectAllowed = 'move';
                            setTaskStepDrag({ taskId: t._id, index: idx });
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={async (event) => {
                            event.preventDefault();
                            try {
                              const payload = JSON.parse(event.dataTransfer.getData('application/x-task-step') || '{}');
                              if (!payload || payload.taskId !== t._id) return;
                              const fromIdx = Number(payload.index);
                              const toIdx = Number(idx);
                              if (!Number.isFinite(fromIdx) || !Number.isFinite(toIdx) || fromIdx === toIdx) return;

                              const nextSteps = [...taskSteps];
                              const [moved] = nextSteps.splice(fromIdx, 1);
                              nextSteps.splice(toIdx, 0, moved);
                              await adminApi.updateTask(t._id, {
                                steps: nextSteps.map((s, i) => ({ ...s, order_index: i })),
                              });
                              await loadContent(selectedStudy);
                              showSuccess('Reihenfolge der Aufgabenstellungen gespeichert.');
                            } catch (err) {
                              showError(err.message || 'Reihenfolge konnte nicht gespeichert werden.');
                            } finally {
                              setTaskStepDrag({ taskId: '', index: -1 });
                            }
                          }}
                          onDragEnd={() => setTaskStepDrag({ taskId: '', index: -1 })}
                        >
                          <div className="task-step-head">
                            <strong>Schritt {idx + 1}</strong>
                            <small>Drag & Drop zum Umsortieren</small>
                          </div>
                          <small>{step.prompt}</small>
                          {Array.isArray(step.correct_ids) && step.correct_ids.length > 0 && (
                            <small>Richtige IDs: {step.correct_ids.join(', ')}</small>
                          )}
                          {Number(step.time_limit_sec || 0) > 0 && (
                            <small>Zeitlimit: {Number(step.time_limit_sec)} Sek.</small>
                          )}
                          <div className="row-actions">
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
                                const limitRaw = window.prompt(
                                  'Zeitlimit in Sekunden (0 = kein Limit)',
                                  String(Number(step.time_limit_sec || 0))
                                );
                                if (limitRaw === null) return;
                                const nextLimit =
                                  Number.isFinite(Number(limitRaw)) && Number(limitRaw) > 0
                                    ? Math.floor(Number(limitRaw))
                                    : 0;
                                const nextSteps = taskSteps.map((s, i) =>
                                  i === idx
                                    ? {
                                        ...s,
                                        prompt: prompt.trim(),
                                        correct_ids: correct.split(',').map((x) => x.trim()).filter(Boolean),
                                        time_limit_sec: nextLimit,
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
                        </article>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setTaskAddStepOpenById((prev) => ({ ...prev, [t._id]: !prev[t._id] }));
                      if (!taskAddStepFormById[t._id]) {
                        setTaskAddStepFormById((prev) => ({
                          ...prev,
                          [t._id]: { prompt: '', correct_ids: '', time_limit_sec: '' },
                        }));
                      }
                    }}
                  >
                    {addStepOpen ? 'Aufgabenstellung schließen' : 'Aufgabenstellung hinzufügen'}
                  </button>
                  {addStepOpen && (
                    <div className="task-add-step-inline">
                      <label className="form-field task-description-field">
                        <span>Neue Aufgabenstellung</span>
                        <textarea
                          rows={3}
                          value={addStepForm.prompt}
                          onChange={(e) =>
                            setTaskAddStepFormById((prev) => ({
                              ...prev,
                              [t._id]: { ...addStepForm, prompt: e.target.value },
                            }))
                          }
                          placeholder="Konkrete Aufgabenanweisung"
                        />
                      </label>
                      <FormField
                        label="Richtige Antwort-IDs (Komma-getrennt)"
                        value={addStepForm.correct_ids}
                        onChange={(e) =>
                          setTaskAddStepFormById((prev) => ({
                            ...prev,
                            [t._id]: { ...addStepForm, correct_ids: e.target.value },
                          }))
                        }
                      />
                      <FormField
                        label="Zeitlimit pro Aufgabenschritt (Sekunden, optional)"
                        value={addStepForm.time_limit_sec}
                        onChange={(e) =>
                          setTaskAddStepFormById((prev) => ({
                            ...prev,
                            [t._id]: { ...addStepForm, time_limit_sec: e.target.value },
                          }))
                        }
                      />
                      <div className="row-actions">
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={async () => {
                            try {
                              const prompt = String(addStepForm.prompt || '').trim();
                              if (!prompt) {
                                showError('Bitte Aufgabenstellung eingeben.');
                                return;
                              }
                              const nextLimit =
                                Number.isFinite(Number(addStepForm.time_limit_sec)) &&
                                Number(addStepForm.time_limit_sec) > 0
                                  ? Math.floor(Number(addStepForm.time_limit_sec))
                                  : 0;
                              const nextSteps = [
                                ...taskSteps,
                                {
                                  prompt,
                                  order_index: taskSteps.length,
                                  correct_ids: String(addStepForm.correct_ids || '')
                                    .split(',')
                                    .map((x) => x.trim())
                                    .filter(Boolean),
                                  time_limit_sec: nextLimit,
                                },
                              ];
                              await adminApi.updateTask(t._id, { steps: nextSteps });
                              await loadContent(selectedStudy);
                              setTaskAddStepOpenById((prev) => ({ ...prev, [t._id]: false }));
                              setTaskAddStepFormById((prev) => ({
                                ...prev,
                                [t._id]: { prompt: '', correct_ids: '', time_limit_sec: '' },
                              }));
                              showSuccess('Aufgabenstellung hinzugefügt.');
                            } catch (err) {
                              showError(err.message || 'Aufgabenstellung konnte nicht hinzugefügt werden.');
                            }
                          }}
                        >
                          Aufgabenstellung speichern
                        </button>
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => {
                            setTaskAddStepOpenById((prev) => ({ ...prev, [t._id]: false }));
                            setTaskAddStepFormById((prev) => ({
                              ...prev,
                              [t._id]: { prompt: '', correct_ids: '', time_limit_sec: '' },
                            }));
                          }}
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {Array.isArray(t.config?.interactive?.selectable_ids) &&
                  t.config.interactive.selectable_ids.length > 0 && (
                    <div className="task-meta-toggle-wrap">
                      <button
                        type="button"
                        className="ghost-btn task-meta-toggle"
                        onClick={() =>
                          setShowClickableIdsByTask((prev) => ({
                            ...prev,
                            [t._id]: !prev[t._id],
                          }))
                        }
                      >
                        <span className="task-meta-icon">{showClickableIdsByTask[t._id] ? '−' : '+'}</span>
                        Klickbare IDs
                      </button>
                      {showClickableIdsByTask[t._id] && (
                        <small className="task-file-meta">
                          {t.config.interactive.selectable_ids.join(', ')}
                        </small>
                      )}
                    </div>
                  )}
                {Array.isArray(t.config?.interactive?.correct_ids) &&
                  t.config.interactive.correct_ids.length > 0 && (
                    <small className="task-file-meta">
                      Richtige IDs: {t.config.interactive.correct_ids.join(', ')}
                    </small>
                  )}
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
