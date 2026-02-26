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
  const [questionText, setQuestionText] = useState('');
  const [cardLabel, setCardLabel] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [items, setItems] = useState({ questions: [], cards: [], tasks: [] });

  useEffect(() => {
    (async () => {
      const [studyRes, usersRes] = await Promise.all([studyApi.list(), adminApi.listUsers()]);
      setStudies(studyRes.items || []);
      setUsers(usersRes || []);
      if (studyRes.items?.[0]?._id) setSelectedStudy(studyRes.items[0]._id);
    })();
  }, []);

  const loadContent = async (studyId) => {
    if (!studyId) return;
    const [questions, cards, tasks] = await Promise.all([
      adminApi.listQuestions(studyId),
      adminApi.listCards(studyId),
      adminApi.listTasks(studyId),
    ]);
    setItems({ questions, cards, tasks });
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

      <CardPanel title="Benutzer & Rollen">
        {users.map((u) => (
          <div key={u._id} className="row-item">
            <div>
              <strong>{u.username}</strong>
              <small>{u.role}</small>
            </div>
            <div className="row-actions">
              <select
                value={u.role}
                onChange={async (e) => {
                  const role = e.target.value;
                  await adminApi.setUserRole(u._id, role);
                  const usersRes = await adminApi.listUsers();
                  setUsers(usersRes || []);
                }}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <button
                type="button"
                className="danger-btn"
                onClick={async () => {
                  const ok = window.confirm(`Nutzer ${u.username} wirklich löschen?`);
                  if (!ok) return;
                  await adminApi.deleteUser(u._id);
                  const usersRes = await adminApi.listUsers();
                  setUsers(usersRes || []);
                }}
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
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
          {items.questions.map((q) => <div key={q._id} className="chip">{q.text}</div>)}
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
          {items.cards.map((c) => <div key={c._id} className="chip">{c.label}</div>)}
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
          {items.tasks.map((t) => <div key={t._id} className="chip">{t.title}</div>)}
        </CardPanel>
      </div>
    </div>
  );
}
