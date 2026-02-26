import { useEffect, useMemo, useState } from 'react';
import { studyApi } from '../api/studies';
import { adminApi } from '../api/admin';
import { CardPanel } from '../components/CardPanel';
import { FormField } from '../components/FormField';
import './AdminPage.css';

export function AdminPage() {
  const [studies, setStudies] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState('');
  const [selectedUserForAssign, setSelectedUserForAssign] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [studyForm, setStudyForm] = useState({ name: '', type: 'mixed' });
  const [questionText, setQuestionText] = useState('');
  const [cardLabel, setCardLabel] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [items, setItems] = useState({ questions: [], cards: [], tasks: [] });
  const [assignmentOpen, setAssignmentOpen] = useState(true);

  useEffect(() => {
    (async () => {
      const [studyRes, usersRes] = await Promise.all([studyApi.list(), adminApi.listUsers()]);
      setStudies(studyRes.items || []);
      setUsers(usersRes || []);
      if (studyRes.items?.[0]?._id) {
        setSelectedStudy(studyRes.items[0]._id);
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
    setItems({ questions, cards, tasks });
    setAssignments(assigned || []);
  };

  useEffect(() => {
    loadContent(selectedStudy);
  }, [selectedStudy]);

  const selectedLabel = useMemo(
    () => studies.find((s) => s._id === selectedStudy)?.name || 'Keine Studie',
    [studies, selectedStudy]
  );

  return (
    <div className="admin-shell">
      <CardPanel title="Content Studio">
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
      </CardPanel>

      <CardPanel title="Studienverwaltung">
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
              <option value="questionnaire">questionnaire</option>
              <option value="card_sort">card_sort</option>
              <option value="image_rating">image_rating</option>
            </select>
          </label>
          <button
            className="primary-btn"
            onClick={async () => {
              const created = await studyApi.create(studyForm);
              const refreshed = await studyApi.list();
              setStudies(refreshed.items || []);
              setSelectedStudy(created._id);
              setStudyForm({ name: '', type: 'mixed' });
            }}
          >
            Studie anlegen
          </button>
        </div>
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
                  if (!selectedStudy || !selectedUserForAssign) return;
                  await adminApi.assignUserToStudy(selectedStudy, selectedUserForAssign);
                  await loadContent(selectedStudy);
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
                    await adminApi.removeAssignment(selectedStudy, a.user_id?._id);
                    await loadContent(selectedStudy);
                  }}
                >
                  Zuweisung entfernen
                </button>
              </div>
            ))}
          </>
        )}
      </CardPanel>

      <div className="admin-grid">
        <CardPanel title="Fragen">
          <FormField label="Frage" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
          <button
            className="primary-btn"
            onClick={async () => {
              await adminApi.createQuestion(selectedStudy, { text: questionText, type: 'text_short', required: true });
              setQuestionText('');
              await loadContent(selectedStudy);
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
                    const text = window.prompt('Frage bearbeiten', q.text);
                    if (!text || text.trim() === q.text) return;
                    await adminApi.updateQuestion(q._id, { text: text.trim() });
                    await loadContent(selectedStudy);
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
              await adminApi.createCard(selectedStudy, { label: cardLabel });
              setCardLabel('');
              await loadContent(selectedStudy);
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
                    const label = window.prompt('Card bearbeiten', c.label);
                    if (!label || label.trim() === c.label) return;
                    await adminApi.updateCard(c._id, { label: label.trim() });
                    await loadContent(selectedStudy);
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

        <CardPanel title="Aufgaben">
          <FormField label="Task Titel" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          <button
            className="primary-btn"
            onClick={async () => {
              await adminApi.createTask(selectedStudy, {
                title: taskTitle,
                description: '',
                task_type: 'instruction',
              });
              setTaskTitle('');
              await loadContent(selectedStudy);
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
                    const title = window.prompt('Aufgabe bearbeiten', t.title);
                    if (!title || title.trim() === t.title) return;
                    await adminApi.updateTask(t._id, { title: title.trim() });
                    await loadContent(selectedStudy);
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
      </div>
    </div>
  );
}
